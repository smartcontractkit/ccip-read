const hre = require("hardhat");
const {ethers} = hre;
const namehash = require('eth-ens-namehash');
const fs = require('fs')
const envfile = require('envfile')
const parsedFile = envfile.parse(fs.readFileSync('./.env'))

const TEST_NODE = namehash.hash('test.test');
async function main() {
  /************************************
   * L2 deploy
   ************************************/
  // Replace the l2 provider with one that points at the l2 node
  // ethers.provider = new ethers.providers.JsonRpcProvider(hre.network.config.url);
  // Deploy L2 resolver and set addr record for test.test
  const accounts = await ethers.getSigners();
  const account = accounts[0].address
  const balance = await accounts[0].getBalance()
  console.log({account, balance:balance.toString()})
  const OptimismResolver = await ethers.getContractFactory("OptimismResolver");
  const resolver = await OptimismResolver.deploy();
  await resolver.deployed();
  console.log(`OptimismResolver deployed to ${resolver.address}`);
  await (await resolver.functions.setAddr(TEST_NODE, account)).wait();
  const testAddress = await resolver.functions.addr(TEST_NODE);
  console.log(`test.test set to ${testAddress}`)
  parsedFile.RESOLVER_ADDRESS = resolver.address
  fs.writeFileSync('./.env', envfile.stringify(parsedFile))
  console.log('Address set');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
