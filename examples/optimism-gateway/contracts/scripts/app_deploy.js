const hre = require("hardhat");
const {ethers, l2ethers} = hre;
const namehash = require('eth-ens-namehash');
const TEST_NODE = namehash.hash('test.test');


async function main() {
  /************************************
   * L2 deploy
   ************************************/

  
  /************************************
   * L1 deploy
   ************************************/
  const accounts = await ethers.getSigners();

  // Deploy the ENS registry
  const ENS = await ethers.getContractFactory("ENSRegistry");
  const ens = await ENS.deploy();
  await ens.deployed();
  console.log(`ENS registry deployed at ${ens.address}`);

  // Create test.test owned by us
  await ens.setSubnodeOwner('0x' + '00'.repeat(32), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test')), accounts[0].address);
  await ens.setSubnodeOwner(namehash.hash('test'), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test')), accounts[0].address);

  // Deploy the resolver stub
  const AppResolverStub = await ethers.getContractFactory("AppResolverStub");
  const stub = await AppResolverStub.deploy(ens.address, "http://localhost:8081/query");
  await stub.deployed();
  const node = namehash.hash('test.test');
  // Set the stub as the resolver for test.test
  await ens.setResolver(node, stub.address);
  const resolver = await ens.resolver(node);
  const owner = await ens.owner(node);
  console.log(`AppResolverStub deployed at ${stub.address}`);
  console.log(`test.test node is`, node)
  console.log(`test.test resolver is set to `, resolver)
  console.log(`test.test owner is set to `, owner)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
