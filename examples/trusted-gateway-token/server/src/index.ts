const durin = require('@ensdomains/durin');
const ethers = require('ethers');
const server = new durin.Server();
const fs = require('fs');
require('dotenv').config({ path: '../.env' })

// const abi = [
//   "function balanceOf(address addr) view returns (uint256)",
//   "function balanceOfWithProof(address addr, bytes proof) view returns (uint256)"
// ];
const abi = [
  {
    "inputs":[
      {"internalType":"address","name":"addr","type":"address"}
    ],
    "name":"balanceOf",
    "outputs":[
      {"internalType":"uint256","name":"balance","type":"uint256"}
    ],
    "stateMutability":"view",
    "type":"function"
  },{
    "inputs":[
      {"internalType":"address","name":"addr","type":"address"},
      {"components":[
        {"internalType":"bytes","name":"signature","type":"bytes"},
        {"internalType":"uint256","name":"balance","type":"uint256"}
      ],
      "internalType":"struct Token.BalanceProof",
      "name":"proof",
      "type":"tuple"
    }],
    "name":"balanceOfWithProof",
    "outputs":[
      {"internalType":"uint256","name":"","type":"uint256"}
    ],
    "stateMutability":"view","type":"function"
  }]

console.log({abi})
const{
  PROVIDER_URL,
  PRIVATE_KEY,
  ADDRESS_FILE_PATH
} = process.env
console.log({
  PROVIDER_URL,
  PRIVATE_KEY,
  ADDRESS_FILE_PATH
})
const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
console.log(1)
let signer = new ethers.Wallet(PRIVATE_KEY);
console.log(2)
const data = fs.readFileSync(ADDRESS_FILE_PATH, 'utf8')
  .split("\n")
  .slice(1) // Remove the header
  .map((d:string) => d.split(","))
  .filter((r:string[]) => r[0] !== '')
  console.log(3)
const balances = data.reduce((map:any, obj:any) => {
  const [key, val] = obj
  map[key] = parseInt(val);
  return map;
}, {});
server.add(abi, [
  {
    calltype: 'balanceOf',
    returntype: 'balanceOfWithProof',
    func: async (_contractAddress:string, addresses:string[]) => {
      const addr = addresses[0]
      const balance = balances[addr] || 0
      console.log('***add:input', {addr, balance})
      let messageHash = ethers.utils.solidityKeccak256(
        ['uint256', 'address'],[balance, addr]
      );
      let messageHashBinary = ethers.utils.arrayify(messageHash);
      const signature = await signer.signMessage(messageHashBinary)
      console.log('***add:output', [addr, {balance, signature}])
      return [addr, {balance, signature}];
    }
  }
], '');
const app = server.makeApp('/rpc');
app.listen(8080);