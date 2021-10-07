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
const abi2 = JSON.parse(
  fs.readFileSync(
    '../server/abis/OptimismResolver.json',
    'utf8'
  )
);
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
  PROVIDER_URL = 'http://localhost:8545'
  L2_PROVIDER_URL = 'http://localhost:8545'
}
const middleware = require('makoto-durin-middleware')
console.log(1)
const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
// const middleware = require('@ensdomains/durin-middleware')
console.log(2)
const durinProvider = new middleware.DurinMiddleware(provider)
console.log(3)
const wrappedProvider = new ethers.providers.Web3Provider(durinProvider)
console.log(4)
// const resolver = new ethers.Contract(RESOLVER_STUB_ADDRESS, abi, provider);
const resolver = new ethers.Contract(RESOLVER_STUB_ADDRESS, abi, wrappedProvider);

// const resolver = new ethers.Contract(RESOLVER_STUB_ADDRESS, abi, d);

console.log({
  RESOLVER_STUB_ADDRESS
})

// function createL2Wallet() {
//   const mnemonicWallet = ethers.Wallet.fromMnemonic(MNEMONIC);
//   return new ethers.Wallet(mnemonicWallet.privateKey, l2provider)
// }

// function sleep(ms:number) {
//   return new Promise((resolve) => {
//     setTimeout(resolve, ms);
//   });
// }
async function addr(node) {
//   try {
    return await resolver.addr(node);
//   } catch (e) {
//     console.log(`*** resolver.addr error: ${e.message}`);
    // if (e.errorName === 'OffchainLookup') {
    //   const url = e.errorArgs[2];
    //   const iface = new ethers.utils.Interface(abi);
    //   const data = iface.encodeFunctionData('addr', [node]);
    //   const body = {
    //     jsonrpc: '2.0',
    //     method: 'durin_call',
    //     params: [{ to: RESOLVER_STUB_ADDRESS, data }],
    //     id: 1,
    //   };
    //   const result = await (
    //     await nodeFetch(url, {
    //       method: 'post',
    //       body: JSON.stringify(body),
    //       headers: { 'Content-Type': 'application/json' },
    //     })
    //   ).json();
    //   try{
    //     const outputdata = await provider.call({
    //       to: RESOLVER_STUB_ADDRESS,
    //       data: result && result.result,
    //     });
    //     return iface.decodeFunctionResult('addrWithProof', outputdata);  
    //   }catch(ee){
    //     console.log(`*** resolver.addrWithProof error: ${ee.message}`);
    //   }
    // } else {
    //   console.log(e);
    // }
    //}
}

async function main() {
  console.log(5)
  console.log(await addr(TEST_NODE));
}

main();