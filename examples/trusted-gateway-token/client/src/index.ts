const nodeFetch = require('node-fetch');
const ethers = require('ethers');
const jayson = require('jayson');
require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const abi = JSON.parse(
  fs.readFileSync(
    '../contracts/artifacts/contracts/Token.sol/Token.json',
    'utf8'
  )
).abi;
const { TOKEN_ADDRESS, PROVIDER_URL, USER_ADDRESS: string } = process.env;
const RECIPIENT = '0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199';
const client = new jayson.client.http({
  port: 8080,
});

const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
const erc20 = new ethers.Contract(TOKEN_ADDRESS, abi, provider);

async function getBalance(address: string) {
  // let url, body, to, data
  try {
    const signer = await erc20.getSigner();
    const balance = await erc20.balanceOf(address);
    console.log({ signer, balance });
  } catch (e) {
    if (e.message.match(/OffchainLookup/)) {
      // Custom error example
      // OffchainLookup(
      //  "https://localhost:8080/rpc",
      //  "0x4961ed120000000000000000000000004627bd7d658ee1474b3f1da1f9ff0bde6b720fcd"
      // )
      const url = 'http://localhost:8080/rpc';
      const iface = new ethers.utils.Interface(abi);
      const data = iface.encodeFunctionData('balanceOf', [address]);
      const body = {
        jsonrpc: '2.0',
        method: 'durin_call',
        params: [{ to: TOKEN_ADDRESS, data }],
        id: 1,
      };

      const result = await (
        await nodeFetch(url, {
          method: 'post',
          body: JSON.stringify(body),
          headers: { 'Content-Type': 'application/json' },
        })
      ).json();

      const balanceData = await provider.call({
        to: TOKEN_ADDRESS,
        data: result.result,
      });
      return iface.decodeFunctionResult('balanceOfWithProof', balanceData);
    } else {
      console.log({ e });
    }
  }
}

async function main() {
  const address = process.env.USER_ADDRESS;
  console.log(
    `USER_ADDRESS ${address} balance ${await getBalance(address || '')}`
  );
  console.log(`RECIPIENT ${RECIPIENT} balance ${await getBalance(RECIPIENT)}`);
}

main();
