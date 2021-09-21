const ethers = require('ethers');
const namehash = require('eth-ens-namehash');
const TEST_NODE = namehash.hash('test.test');
const nodeFetch = require('node-fetch');
require('dotenv').config({ path: '../contracts/.env' });
const fs = require('fs');
const abi = JSON.parse(
  fs.readFileSync(
    '../server/abis/OptimismResolverStub.json',
    'utf8'
  )
);
const {
  RESOLVER_ADDRESS,
  RESOLVER_STUB_ADDRESS
} = process.env;
const PROVIDER_URL = 'http://localhost:9545'
const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);

const resolver = new ethers.Contract(RESOLVER_STUB_ADDRESS, abi, provider);
console.log({
  RESOLVER_STUB_ADDRESS
})
TEST_NODE
async function addr(node: string) {
  try {
    return await resolver.addr(node);
  } catch (e) {
    console.log({e})
    
    if (true) {
      // Hardcode the url until https://github.com/nomiclabs/hardhat/issues/1882 is solved
      const url = 'http://localhost:8081/rpc';
      const iface = new ethers.utils.Interface(abi);
      const data = iface.encodeFunctionData('addr', [TEST_NODE]);
      const body = {
        jsonrpc: '2.0',
        method: 'durin_call',
        params: [{ to: RESOLVER_STUB_ADDRESS, data }],
        id: 1,
      };
      const result = await (
        await nodeFetch(url, {
          method: 'post',
          body: JSON.stringify(body),
          headers: { 'Content-Type': 'application/json' },
        })
      ).json();
      const outputdata = await provider.call({
        to: RESOLVER_STUB_ADDRESS,
        data: result && result.result,
      });
      return iface.decodeFunctionResult('addrWithProof', outputdata);
    } else {
      console.log({ e });
    }
  }
}

async function main() {
  console.log(await addr(TEST_NODE));
}

main();