import { ethers, BigNumber } from 'ethers';
import { MerkleTree } from 'merkletreejs'
import { OptimismResolverStub__factory } from './contracts/factories/OptimismResolverStub__factory';
import { loadContract, loadContractFromManager } from './ovm-contracts';
import { RLP } from 'ethers/lib/utils';
const durin = require('@ensdomains/durin');
const abi = require('../abis/OptimismResolverStub.json')
// Instantiate the ethers provider
const L1_PROVIDER_URL = "http://localhost:9545/";
const l1_provider = new ethers.providers.JsonRpcProvider(L1_PROVIDER_URL);

const L2_PROVIDER_URL = "http://localhost:8545/";
const l2_provider = new ethers.providers.JsonRpcProvider(L2_PROVIDER_URL);

const ADDRESS_MANAGER_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// Instantiate the manager
const ovmAddressManager = loadContract('Lib_AddressManager', ADDRESS_MANAGER_ADDRESS, l1_provider);

interface StateRootBatchHeader {
    batchIndex: BigNumber
    batchRoot: string
    batchSize: BigNumber
    prevTotalElements: BigNumber
    extraData: string
}

async function getLatestStateBatchHeader(): Promise<{batch: StateRootBatchHeader, stateRoots: string[]}> {
    // Instantiate the state commitment chain
    const ovmStateCommitmentChain = await loadContractFromManager('OVM_StateCommitmentChain', ovmAddressManager, l1_provider);
    for(let endBlock = await l1_provider.getBlockNumber(); endBlock > 0; endBlock = Math.max(endBlock - 100, 0)) {
        // TODO: Replace with Optimism's own indexer
        const startBlock = Math.max(endBlock - 100 , 1);
        const events: ethers.Event[] = await ovmStateCommitmentChain.queryFilter(
            ovmStateCommitmentChain.filters.StateBatchAppended(), startBlock, endBlock);
        console.log(`${events.length} events between ${startBlock} - ${endBlock}`)
        if(events.length > 0) {
            const event = events[events.length - 1];
            const tx = await l1_provider.getTransaction(event.transactionHash);
            const [ stateRoots ] = ovmStateCommitmentChain.interface.decodeFunctionData('appendStateBatch', tx.data);
            return {
                batch: {
                    batchIndex: event.args?._batchIndex,
                    batchRoot: event.args?._batchRoot,
                    batchSize: event.args?._batchSize,
                    prevTotalElements: event.args?._prevTotalElements,
                    extraData: event.args?._extraData,
                },
                stateRoots,
            }
        }
    }
    throw Error("No state root batches found");
}

const server = new durin.Server();
server.add(
  abi,
  [
    {
      // addr(bytes32 node)
      calltype: 'addr',
      returntype: 'addrWithProof',
      func: async (args: string[], _context: any) => {
        const node = args[0];
        const address = _context[0]['to']
        const contract = OptimismResolverStub__factory.connect(address, l1_provider);
        let stateBatchHeader:any
        try{
          stateBatchHeader = await getLatestStateBatchHeader();
        }catch(e){
          console.log('stateBatchHeader error', {e})
        }

        // The l2 block number we'll use is the last one in the state batch
        const l2BlockNumber = stateBatchHeader.batch.prevTotalElements.add(stateBatchHeader.batch.batchSize);
        // Construct a merkle proof for the state root we need
        const elements = []
        for (
          let i = 0;
          i < Math.pow(2, Math.ceil(Math.log2(stateBatchHeader.stateRoots.length)));
          i++
        ) {
          if (i < stateBatchHeader.stateRoots.length) {
            console.log('push1', i, stateBatchHeader.stateRoots[i])
            elements.push(stateBatchHeader.stateRoots[i])
          } else {
            console.log('push2', i, '0x' + '00'.repeat(32), ethers.utils.keccak256('0x' + '00'.repeat(32)))
            elements.push(ethers.utils.keccak256('0x' + '00'.repeat(32)))
          }
        }
        const hash = (el: Buffer | string): Buffer => {
          return Buffer.from(ethers.utils.keccak256(el).slice(2), 'hex')
        }
        const leaves = elements.map((element) => {
          return Buffer.from(element.slice(2), 'hex')
        })
        const index = elements.length - 1;
        const tree = new MerkleTree(leaves, hash)
        const treeProof = tree.getProof(leaves[index], index).map((element) => {
          return element.data
        });
        // Get the address for the L2 resolver contract, and the slot that contains the data we want
        const l2ResolverAddress = await contract.l2resolver();
        const addrSlot = ethers.utils.keccak256(node + '00'.repeat(31) + '01');
        // Get a proof of the contents of that slot at the required L2 block
        const tag = '0x' + BigNumber.from(l2BlockNumber).toHexString().slice(2).replace(/^0+/, '')
        const proof = await l2_provider.send('eth_getProof', [
          l2ResolverAddress,
          [addrSlot],
          tag
        ]);
        let r = [
            node,
            {
                stateRoot: stateBatchHeader.stateRoots[index],
                stateRootBatchHeader: stateBatchHeader.batch,
                stateRootProof: {
                    index,
                    siblings: treeProof,
                },
                stateTrieWitness: RLP.encode(proof.accountProof),
                storageTrieWitness: RLP.encode(proof.storageProof[0].proof),
            }
        ];
        console.log({r})
        return r
      }
    }
  ],
  ''
);
const app = server.makeApp('/query');
app.listen(8081);