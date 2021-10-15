const ethers = require('ethers');
const namehash = require('eth-ens-namehash');
const TEST_NODE = namehash.hash('test.test');
const TEST2_NODE = namehash.hash('test2.test');
const nodeFetch = require('node-fetch');
const TEST_ADDRESS = "0x0000000000000000000000000000000000000001";

require('dotenv').config({ path: '../contracts/.env' });
const fs = require('fs');
const abi = [...JSON.parse(
  fs.readFileSync(
    '../server/abis/OptimismResolverStub.json',
    'utf8'
  )
), 'error OffchainLookup(bytes,bytes,string)'
]
const {
  MNEMONIC,
  RESOLVER_ADDRESS,
  RESOLVER_STUB_ADDRESS,
  NETWORK,
  INFURA_API_KEY
} = process.env;
let PROVIDER_URL, L2_PROVIDER_URL
if(NETWORK === 'kovan'){
  PROVIDER_URL = `https://kovan.infura.io/v3/${INFURA_API_KEY}`
  L2_PROVIDER_URL = 'https://kovan.optimism.io'
}else{
  PROVIDER_URL = 'http://localhost:9545'
  L2_PROVIDER_URL = 'http://localhost:8545'
}

const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
const middleware = require('@ensdomains/durin-middleware')
const durinProvider = new middleware.DurinMiddleware(provider)
const wrappedProvider = new ethers.providers.Web3Provider(durinProvider)
const resolver = new ethers.Contract(RESOLVER_STUB_ADDRESS, abi, wrappedProvider);
// const resolver = new ethers.Contract(RESOLVER_STUB_ADDRESS, abi, provider);

resolver.addr(namehash.hash('test.test'))
  .then(console.log)
  .catch(console.log) 