const ethers = require('ethers');
const namehash = require('eth-ens-namehash');
const TEST_NODE = namehash.hash('test.test');
const TEST2_NODE = namehash.hash('test2.test');
const nodeFetch = require("node-fetch")
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
  PROVIDER_URL = 'http://localhost:9545'
  L2_PROVIDER_URL = 'http://localhost:8545'
}
const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
const l2provider = new ethers.providers.JsonRpcProvider(L2_PROVIDER_URL);
const resolver = new ethers.Contract(RESOLVER_STUB_ADDRESS, abi, provider);

console.log({
  RESOLVER_STUB_ADDRESS
})

function createL2Wallet() {
  const mnemonicWallet = ethers.Wallet.fromMnemonic(MNEMONIC);
  return new ethers.Wallet(mnemonicWallet.privateKey, l2provider)
}

function sleep(ms:number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function addr(node: string) {
  try {
    return await resolver.addr(node);
  } catch (e) {
    console.log(`*** resolver.addr error: ${e.message}`);
    if (e.errorName === 'OffchainLookup') {
      const url = e.errorArgs[2]; // Tested with our adapter deployed in our infra.  URL: https://adapters.main.stage.cldev.sh/durin
      const iface = new ethers.utils.Interface(abi);
      const data = iface.encodeFunctionData('addr', [node]);
      const reqBody = {
        id: "1",
        data: {
          to: RESOLVER_STUB_ADDRESS,
          abi,
          data
        }
      }
      const resp = await nodeFetch(
        url, 
        {
          method: 'post',
          body: JSON.stringify(reqBody),
          headers: {'Content-Type': 'application/json'}
        }
      )
      const result = (await resp.json()).result 
      try {
        const outputdata = await provider.call({
          to: RESOLVER_STUB_ADDRESS,
          data: result,
        });
        return iface.decodeFunctionResult('addrWithProof', outputdata);  
      } catch(ee){
        console.log(`*** resolver.addrWithProof error: ${ee.message}`);
      }
    } else {
      console.log(e);
    }
  }
}

async function main() {
  console.log('Ask durin for test.test');
  console.log(await addr(TEST_NODE));
  console.log('Ask durin for test2.test');
  console.log(await addr(TEST2_NODE));
  const l2resolver = new ethers.Contract(RESOLVER_ADDRESS, abi2, createL2Wallet());
  console.log('Update test.test on l2');
  await (await l2resolver.setAddr(TEST_NODE, TEST_ADDRESS)).wait();
  console.log('Set new value to l2', await l2resolver.addr(TEST_NODE));
  console.log('Wait 10 sec');
  await sleep(10000)
  console.log('Ask durin again');
  console.log(await addr(TEST_NODE));
}

main();