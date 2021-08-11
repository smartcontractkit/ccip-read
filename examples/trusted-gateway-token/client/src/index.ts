const nodeFetch = require('node-fetch');
const ethers = require('ethers');
const jayson = require('jayson');
require('dotenv').config()
const{
  TOKEN_ADDRESS,
  USER_ADDRESS
} = process.env

const client = new jayson.client.http({
  port: 8080
});
const abi = [
  "function balanceOf(address addr) view returns (uint256)",
  "function balanceOfWithProof(address addr, uint256 balance, bytes proof) view returns (uint256)"
];

const iface = new ethers.utils.Interface(abi)
const data = iface.encodeFunctionData("balanceOf(address addr)", [USER_ADDRESS])
const body = {
  jsonrpc: '2.0',
  method: 'durin_call',
  params: [{to:TOKEN_ADDRESS, data}],
  id: 1,
}

nodeFetch('http://localhost:8080/rpc', {
  method: 'post',
  body:    JSON.stringify(body),
  headers: { 'Content-Type': 'application/json' },
})
.then((res:any) => res.json())
.then((json:any) => console.log(json));
