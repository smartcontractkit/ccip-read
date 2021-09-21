const hre = require("hardhat");
const {ethers} = hre;
const namehash = require('eth-ens-namehash');
const fs = require('fs')
const envfile = require('envfile')
const parsedFile = envfile.parse(fs.readFileSync('./.env'))

const TEST_NODE = namehash.hash('test.test');
const L1_PROVIDER_URL = "http://localhost:9545/";
const l1_provider = new ethers.providers.JsonRpcProvider(L1_PROVIDER_URL);

async function main() {
  const { RESOLVER_ADDRESS } = parsedFile
  console.log({RESOLVER_ADDRESS})
  const accounts = await ethers.getSigners();
  const resolver = await hre.ethers.getContractAt('OptimismResolver', RESOLVER_ADDRESS);
  console.log('block', await l1_provider.getBlockNumber())
  await (await resolver.functions.setAddr(TEST_NODE, accounts[2].address)).wait();
  console.log('Address set');
  console.log(await resolver.functions.addr(TEST_NODE))
  console.log('block', await l1_provider.getBlockNumber())
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
