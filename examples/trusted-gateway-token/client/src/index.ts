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
const {
  TOKEN_ADDRESS,
  PROVIDER_URL,
  SENDER_PRIVATE_KEY
} = process.env;
const RECIPIENT = '0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199';
const client = new jayson.client.http({
  port: 8080,
});

const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
const signer = new ethers.Wallet(SENDER_PRIVATE_KEY);

const erc20 = new ethers.Contract(TOKEN_ADDRESS, abi, provider);
const SENDER_ADDRESS = signer.address
console.log({
  TOKEN_ADDRESS,
  SENDER_ADDRESS
})
async function getBalance(address: string) {
  try {
    return await erc20.balanceOf(address);
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
      const outputdata = await provider.call({
        to: TOKEN_ADDRESS,
        data: result.result,
      });
      return iface.decodeFunctionResult('balanceOfWithProof', outputdata);
    } else {
      console.log({ e });
    }
  }
}

async function transfer(fromAddress: string, toAddress: string, amount: number){
  try{
    await erc20.estimateGas.transfer(toAddress, amount);
  }catch(e){
    if(e.message.match(/OffchainLookup/)){
      const url = "http://localhost:8080/rpc"
      const iface = new ethers.utils.Interface(abi)
      const inputdata = iface.encodeFunctionData("transfer", [toAddress, amount])
      const body = {
        jsonrpc: '2.0',
        method: 'durin_call',
        params: [{to:TOKEN_ADDRESS, from:fromAddress, data:inputdata}],
        id: 1,
      }

      const result:any  = await (await nodeFetch(url, {
        method: 'post',
        body:    JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })).json()
      const nonce = await provider.getTransactionCount(signer.address)
      const signedTransaction = await signer.signTransaction({
        nonce,
        gasLimit: 500000,
        gasPrice: ethers.BigNumber.from("1000000000"),
        to: TOKEN_ADDRESS,
        data: result.result,
      });
      await provider.sendTransaction(signedTransaction)
    }else{
      console.log({e})
    }
  }
}

async function main() {
  const amount = 1
  console.log(`SENDER ${SENDER_ADDRESS} balance ${await getBalance(SENDER_ADDRESS || '')}`);
  console.log(`RECIPIENT ${RECIPIENT} balance ${await getBalance(RECIPIENT)}`);
  console.log(`TRANSFER ${amount} from ${SENDER_ADDRESS} to ${RECIPIENT}`)
  await transfer(SENDER_ADDRESS || '', RECIPIENT, amount)
  console.log(`SENDER ${SENDER_ADDRESS} balance ${await getBalance(SENDER_ADDRESS || '')}`);
  console.log(`RECIPIENT ${RECIPIENT} balance ${await getBalance(RECIPIENT)}`);
}

main();
