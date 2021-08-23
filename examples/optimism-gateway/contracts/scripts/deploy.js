const hre = require("hardhat");
const {ethers, l2ethers} = hre;
const namehash = require('eth-ens-namehash');

const OVM_ADDRESS_MANAGER = "0x3e4CFaa8730092552d9425575E49bB542e329981";
const TEST_NODE = namehash.hash('test.test');

async function main() {
  /************************************
   * L2 deploy
   ************************************/
  // Replace the l2 provider with one that points at the l2 node
  l2ethers.provider = new l2ethers.providers.JsonRpcProvider(hre.network.config.l2url);

  // Deploy L2 resolver and set addr record for test.test
  const l2accounts = await l2ethers.getSigners();
  const OptimismResolver = await l2ethers.getContractFactory("OptimismResolver");
  const resolver = await OptimismResolver.deploy();
  await resolver.deployed();
  console.log(`OptimismResolver deployed to ${resolver.address}`);

  await (await resolver.functions.setAddr(TEST_NODE, l2accounts[0].address)).wait();
  console.log('Address set');
  
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
  const OptimismResolverStub = await ethers.getContractFactory("OptimismResolverStub");
  const stub = await OptimismResolverStub.deploy(OVM_ADDRESS_MANAGER, "http://localhost:8081/query", resolver.address);
  await stub.deployed();

  // Set the stub as the resolver for test.test
  await ens.setResolver(namehash.hash('test.test'), stub.address);

  console.log(`OptimismResolverStub deployed at ${stub.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
