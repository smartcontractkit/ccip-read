const hre = require("hardhat");
const {ethers} = hre;
const namehash = require('eth-ens-namehash');
const fs = require('fs')
const envfile = require('envfile')
const parsedFile = envfile.parse(fs.readFileSync('./.env'))
const { predeploys, getContractInterface } = require('@eth-optimism/contracts')

// const OVM_ADDRESS_MANAGER = "0x3e4CFaa8730092552d9425575E49bB542e329981";
const OVM_ADDRESS_MANAGER = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const TEST_NODE = namehash.hash('test.test');

console.log({predeploys})

const loadContractFromManager = async (
  name,
  Lib_AddressManager,
  provider
) => {
  const address = await Lib_AddressManager.getAddress(name)
  if (parseInt(address) === 0) {
    throw new Error(
      `Lib_AddressManager does not have a record for a contract named: ${name}`
    )
  }
  return new ethers.Contract(address, getContractInterface(name), provider)
}
const ADDRESS_MANAGER_ADDRESS = OVM_ADDRESS_MANAGER;

// Instantiate the manager

async function main() {
  const l1_provider = ethers.provider
  const ovmAddressManager = new ethers.Contract(ADDRESS_MANAGER_ADDRESS, getContractInterface('Lib_AddressManager'), l1_provider);
  endBlock = await l1_provider.getBlockNumber()
  const startBlock = Math.max(endBlock - 100, 1);
  const ovmStateCommitmentChain = await loadContractFromManager('OVM_StateCommitmentChain', ovmAddressManager, l1_provider);
  const stateBatch = ovmStateCommitmentChain.filters.StateBatchAppended();
  console.log({stateBatch, startBlock, endBlock})
  const events = await ovmStateCommitmentChain.queryFilter(stateBatch, startBlock, endBlock);
  // console.log({events})
  let result
  if(events.length > 0) {
    const event = events[events.length - 1];
    const tx = await l1_provider.getTransaction(event.transactionHash);
    const [ stateRoots ] = ovmStateCommitmentChain.interface.decodeFunctionData('appendStateBatch', tx.data);
    result = {
        batch: {
            batchIndex: event.args?._batchIndex,
            batchRoot: event.args?._batchRoot,
            batchSize: event.args?._batchSize,
            prevTotalElements: event.args?._prevTotalElements,
            extraData: event.args?._extraData,
        },
        stateRoots,
    }
    console.log({result})
    return result
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
