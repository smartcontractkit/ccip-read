const nodeFetch = require('node-fetch');
const ethers = require('ethers');
const jayson = require('jayson');
require('dotenv').config({ path: '../.env' })
const fs = require('fs');
const abi = JSON.parse(fs.readFileSync('../contracts/artifacts/contracts/Token.sol/Token.json', 'utf8')).abi
const{
  TOKEN_ADDRESS,
  PROVIDER_URL,
  USER_ADDRESS:string
} = process.env
const RECIPIENT = '0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199'
const client = new jayson.client.http({
  port: 8080
});

async function getBalance(address: string){
  const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
  const erc20 = new ethers.Contract(TOKEN_ADDRESS, abi, provider);
  // let url, body, to, data
  try{
    const signer = await erc20.getSigner()
    const balance = await erc20.balanceOf(address);
    console.log({signer, balance})
  }catch(e){
    if(e.message.match(/OffchainLookup/)){
      // url = "https://localhost:8080/rpc", 
      // body = "0x4961ed12000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266"
      // to = "0x5fbdb2315678afecb367f032d93f642f64180aa3"
      // data = "0x70a08231000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266"

      const iface = new ethers.utils.Interface(abi)
      const data = iface.encodeFunctionData("balanceOf(address addr)", [address])
      const body = {
        jsonrpc: '2.0',
        method: 'durin_call',
        params: [{to:TOKEN_ADDRESS, data}],
        id: 1,
      }

      const result  = await (await nodeFetch('http://localhost:8080/rpc', {
        method: 'post',
        body:    JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })).json()
      const {addr, proof} = iface.decodeFunctionData("balanceOfWithProof", result.result);
      const balance = await erc20.balanceOfWithProof(addr, proof);
      return balance
  
    }else{
      console.log({e})
    }
  }
}

async function main(){
  const address = process.env.USER_ADDRESS;
  console.log(`USER_ADDRESS ${address} balance ${await getBalance( address || '')}`)
  console.log(`RECIPIENT ${RECIPIENT} balance ${await getBalance( RECIPIENT )}` )
}

main()
