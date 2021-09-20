const hre = require("hardhat");
const {ethers} = hre;
const namehash = require('eth-ens-namehash');
const fs = require('fs')
const envfile = require('envfile')
const parsedFile = envfile.parse(fs.readFileSync('./.env'))

const OVM_ADDRESS_MANAGER = "0x3e4CFaa8730092552d9425575E49bB542e329981";
const TEST_NODE = namehash.hash('test.test');

async function main() {
  /************************************
   * L2 deploy
   ************************************/
  // Replace the l2 provider with one that points at the l2 node
  // ethers.provider = new ethers.providers.JsonRpcProvider(hre.network.config.url);
  // Deploy L2 resolver and set addr record for test.test
  const accounts = await ethers.getSigners();
  const balance = await accounts[0].getBalance()
  console.log({balance, balance2: balance.toString()})
  console.log(1)
  const OptimismResolver = await ethers.getContractFactory("OptimismResolver");
  console.log(2)
  const resolver = await OptimismResolver.deploy({gasPrice: 15000000, gasLimit:50000000});
  console.log(3)
  await resolver.deployed();
  console.log(4)
  console.log(`OptimismResolver deployed to ${resolver.address}`);
  await (await resolver.functions.setAddr(TEST_NODE, accounts[0].address)).wait();
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
