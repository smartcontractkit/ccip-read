const hre = require("hardhat");
const { ethers } = hre;
const namehash = require('eth-ens-namehash');
const fs = require('fs')
const envfile = require('envfile')
const parsedFile = envfile.parse(fs.readFileSync('./.env'))
// const OVM_ADDRESS_MANAGER = "0x3e4CFaa8730092552d9425575E49bB542e329981";
const TEST_NODE = namehash.hash('test.test');

async function main() {
  const { RESOLVER_ADDRESS, REGISTRY_ADDRESS, VERIFIER_ADDRESS, RESOLVER_STUB_ADDRESS, NETWORK } = parsedFile

  console.log({ RESOLVER_ADDRESS })
  /************************************
   * L1 deploy
   ************************************/
  const accounts = await ethers.getSigners();
  const balance = await accounts[0].getBalance()
  console.log({balance, address:accounts[0].address})
  // Deploy the ENS registry
  let ens, verifier, stub, OVM_ADDRESS_MANAGER
  if(NETWORK === 'local'){
    OVM_ADDRESS_MANAGER = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  }else if('kovan'){
    OVM_ADDRESS_MANAGER = "0x100Dd3b414Df5BbA2B542864fF94aF8024aFdf3a";
  }else if('mainnet'){
    OVM_ADDRESS_MANAGER = "0xdE1FCfB0851916CA5101820A69b13a4E276bd81F";
  }
  const ENS = await ethers.getContractFactory("ENSRegistry");
  if(!REGISTRY_ADDRESS){
    ens = await ENS.deploy();
    await ens.deployed();
    // Create test.test owned by us
    await ens.setSubnodeOwner('0x' + '00'.repeat(32), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test')), accounts[0].address);
    await ens.owner(namehash.hash('test'))
    await ens.setSubnodeOwner(namehash.hash('test'), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test')), accounts[0].address);
    await ens.owner(namehash.hash('test.test'))
    parsedFile.REGISTRY_ADDRESS = ens.address
    fs.writeFileSync('./.env', envfile.stringify(parsedFile))
    console.log(`ENS registry deployed at ${ens.address}`);  
  }else{
    ens = await ENS.attach(REGISTRY_ADDRESS);
    console.log({ REGISTRY_ADDRESS })
  }

  // Deploy the resolver stub
  const OptimismVerifier = await ethers.getContractFactory("OptimismVerifier");
  if(!VERIFIER_ADDRESS){
    verifier = await OptimismVerifier.deploy(OVM_ADDRESS_MANAGER);
    await verifier.deployed();
    parsedFile.VERIFIER_ADDRESS = verifier.address
    fs.writeFileSync('./.env', envfile.stringify(parsedFile))
    console.log(`VERIFIER_ADDRESS deployed at ${verifier.address}`);
  }else{
    verifier = await OptimismVerifier.attach(VERIFIER_ADDRESS)
    console.log({VERIFIER_ADDRESS})
  }

  const OptimismResolverStub = await ethers.getContractFactory("OptimismResolverStub");
  if(!RESOLVER_STUB_ADDRESS){
    const stub = await OptimismResolverStub.deploy(verifier.address, "http://localhost:8081/query", RESOLVER_ADDRESS);
    await stub.deployed();
    // Set the stub as the resolver for test.test
    await ens.setResolver(namehash.hash('test.test'), stub.address);
    console.log(`OptimismResolverStub deployed at ${stub.address}`);
    parsedFile.RESOLVER_STUB_ADDRESS = stub.address
    fs.writeFileSync('./.env', envfile.stringify(parsedFile))  
  }else{
    console.log({RESOLVER_STUB_ADDRESS})
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
