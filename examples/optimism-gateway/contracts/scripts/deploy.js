const hre = require("hardhat");
const { ethers } = hre;
const namehash = require('eth-ens-namehash');
const fs = require('fs')
const envfile = require('envfile')
const parsedFile = envfile.parse(fs.readFileSync('./.env'))
// const ADDRESS_MANAGER = "0x3e4CFaa8730092552d9425575E49bB542e329981";
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
  let ens, verifier, ADDRESS_MANAGER
  if(NETWORK === 'local'){
    ADDRESS_MANAGER = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  }else if('kovan'){
    ADDRESS_MANAGER = "0x100Dd3b414Df5BbA2B542864fF94aF8024aFdf3a";
  }else if('mainnet'){
    ADDRESS_MANAGER = "0xdE1FCfB0851916CA5101820A69b13a4E276bd81F";
  }
  console.log('deploy1')
  const ENS = await ethers.getContractFactory("ENSRegistry");
  console.log('deploy2')
  if(!REGISTRY_ADDRESS){
    console.log('deploy3')
    ens = await ENS.deploy();
    console.log('deploy4')
    await ens.deployed();
    console.log('deploy5', accounts[0].address)
    // Create test.test owned by us
    let tx = await ens.setSubnodeOwner('0x' + '00'.repeat(32), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test')), accounts[0].address);
    await tx.wait()
    console.log('deploy6', await ens.owner(namehash.hash('test')))
    console.log('deploy7', await ens.owner(namehash.hash('test')))
    tx = await ens.setSubnodeOwner(namehash.hash('test'), ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test')), accounts[0].address);
    await tx.wait()
    console.log('deploy8', await ens.owner(namehash.hash('test.test')))
    parsedFile.REGISTRY_ADDRESS = ens.address
    fs.writeFileSync('./.env', envfile.stringify(parsedFile))
    console.log(`ENS registry deployed at ${ens.address}`);  
  }else{
    console.log('deploy10')
    ens = await ENS.attach(REGISTRY_ADDRESS);
    console.log('deploy11')
    console.log({ REGISTRY_ADDRESS })
  }

  // Deploy the resolver stub
  const OptimismVerifier = await ethers.getContractFactory("OptimismVerifier");
  if(!VERIFIER_ADDRESS){
    verifier = await OptimismVerifier.deploy(ADDRESS_MANAGER);
    await verifier.deployed();
    parsedFile.VERIFIER_ADDRESS = verifier.address
    fs.writeFileSync('./.env', envfile.stringify(parsedFile))
    console.log(`VERIFIER_ADDRESS deployed at ${verifier.address}`);
  }else{
    verifier = await OptimismVerifier.attach(VERIFIER_ADDRESS)
    console.log({VERIFIER_ADDRESS})
  }

  const OptimismResolverStub = await ethers.getContractFactory("OptimismResolverStub");
  console.log('deploy12')
  if(!RESOLVER_STUB_ADDRESS){
    const stub = await OptimismResolverStub.deploy(verifier.address, "http://localhost:8081/query", RESOLVER_ADDRESS);
    console.log('deploy13')
    await stub.deployed();
    console.log('deploy14')
    // Set the stub as the resolver for test.test
    await ens.setResolver(namehash.hash('test.test'), stub.address);
    console.log('deploy15')
    console.log(`OptimismResolverStub deployed at ${stub.address}`);
    console.log('deploy16')
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
