const hre = require("hardhat");
const { ethers } = hre;
const namehash = require('eth-ens-namehash');
const fs = require('fs')
const envfile = require('envfile')
const parsedFile = envfile.parse(fs.readFileSync('./.env'))
const OVM_ADDRESS_MANAGER = "0x3e4CFaa8730092552d9425575E49bB542e329981";
const TEST_NODE = namehash.hash('test.test');

async function main() {
  const { RESOLVER_ADDRESS } = parsedFile
  console.log({ RESOLVER_ADDRESS })
  /************************************
   * L1 deploy
   ************************************/
  const accounts = await ethers.getSigners();
  const balance = await accounts[0].getBalance()
  console.log({balance})

  // Deploy the ENS registry
  const ENS = await ethers.getContractFactory("ENSRegistry");
  const ens = await ENS.deploy();
  await ens.deployed();
  console.log(`ENS registry deployed at ${ens.address}`);

  // Create test.test owned by us
  await ens.setSubnodeOwner('0x' + '00'.repeat(32), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test')), accounts[0].address);
  await ens.setSubnodeOwner(namehash.hash('test'), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test')), accounts[0].address);

  // Deploy the resolver stub
  const OptimismVerifier = await ethers.getContractFactory("OptimismVerifier");
  const verifier = await OptimismVerifier.deploy(OVM_ADDRESS_MANAGER);
  await verifier.deployed();

  const OptimismResolverStub = await ethers.getContractFactory("OptimismResolverStub");
  const stub = await OptimismResolverStub.deploy(verifier.address, "http://localhost:8081/query", RESOLVER_ADDRESS);
  await stub.deployed();
  // Set the stub as the resolver for test.test
  await ens.setResolver(namehash.hash('test.test'), stub.address);
  console.log(`OptimismResolverStub deployed at ${stub.address}`);
  parsedFile.RESOLVER_STUB_ADDRESS = stub.address
  fs.writeFileSync('./.env', envfile.stringify(parsedFile))

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
