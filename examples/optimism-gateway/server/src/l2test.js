const { Contract, ethers, BigNumber } = require('ethers');
const { getContractInterface } = require('@eth-optimism/contracts')
const { MerkleTree } = require('merkletreejs');
// const { OptimismResolverStub__factory } = require('./src/contracts/factories/OptimismResolverStub__factory');

const loadContract = (
  name,
  address,
  provider
) => {
  return new Contract(address, getContractInterface(name), provider)
}

const loadContractFromManager = async (
  name,
  Lib_AddressManager,
  provider
) => {
  const address = await Lib_AddressManager.getAddress(name)
  if (address === ZERO_ADDRESS) {
    throw new Error(
      `Lib_AddressManager does not have a record for a contract named: ${name}`
    )
  }
  console.log('***loadContractFromManager3', name, address)
  return loadContract(name, address, provider)
}


const  { RLP } = require('ethers/lib/utils');
const durin = require('@ensdomains/durin');
const abi = require('../abis/OptimismResolverStub.json')
console.log(JSON.stringify(abi))
// Instantiate the ethers provider
const L1_PROVIDER_URL = "http://localhost:9545/";
const l1_provider = new ethers.providers.JsonRpcProvider(L1_PROVIDER_URL);

const L2_PROVIDER_URL = "http://localhost:8545/";
const l2_provider = new ethers.providers.JsonRpcProvider(L2_PROVIDER_URL);

const ADDRESS_MANAGER_ADDRESS = '0x3e4CFaa8730092552d9425575E49bB542e329981';

// Instantiate the manager
const ovmAddressManager = loadContract('Lib_AddressManager', ADDRESS_MANAGER_ADDRESS, l1_provider);

async function getLatestStateBatchHeader(){
    // Instantiate the state commitment chain
    console.log('***getLatestStateBatchHeader1')
    const stateCommitmentChain = await loadContractFromManager('StateCommitmentChain', ovmAddressManager, l1_provider);
    console.log('***getLatestStateBatchHeader2', stateCommitmentChain)
    for(let endBlock = await l1_provider.getBlockNumber(); endBlock > 0; endBlock = Math.max(endBlock - 100, 0)) {
        console.log('***getLatestStateBatchHeader3', stateCommitmentChain)
        const startBlock = Math.max(endBlock - 100, 1);
        const events = await stateCommitmentChain.queryFilter(
            stateCommitmentChain.filters.StateBatchAppended(), startBlock, endBlock);
        if(events.length > 0) {
            const event = events[events.length - 1];
            const tx = await l1_provider.getTransaction(event.transactionHash);
            const [ stateRoots ] = stateCommitmentChain.interface.decodeFunctionData('appendStateBatch', tx.data);
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

// getLatestStateBatchHeader()

async function main(){
  const L1_PROVIDER_URL = "http://localhost:9545/";
  const l1_provider = new ethers.providers.JsonRpcProvider(L1_PROVIDER_URL);
  const ADDRESS_MANAGER_ADDRESS = '0x3e4CFaa8730092552d9425575E49bB542e329981';  
  // Instantiate the manager
  const abi = getContractInterface('Lib_AddressManager')
  console.log(1, JSON.stringify(abi))
  const addressManager = new Contract(ADDRESS_MANAGER_ADDRESS, abi, l1_provider) 
  console.log(2)
  const owner = await addressManager.owner()
  console.log(3, {owner})
  const address = await addressManager.getAddress('StateCommitmentChain')
  console.log(4, {address})
}
main()