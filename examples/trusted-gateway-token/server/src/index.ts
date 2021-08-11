const durin = require('@ensdomains/durin');
const ethers = require('ethers');
const server = new durin.Server();
require('dotenv').config()
const abi = [
  "function balanceOf(address addr) view returns (uint256)",
  "function balanceOfWithProof(address addr, uint256 balance, bytes proof) view returns (uint256)"
];
const{
  PROVIDER_URL,
  PRIVATE_KEY,
  TOKEN_ADDRESS
} = process.env
console.log(1)
const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
console.log(2)
let signer = new ethers.Wallet(PRIVATE_KEY);
console.log(3)

server.add(abi, [
  {
    calltype: 'balanceOf',
    returntype: 'balanceOfWithProof',
    func: async (contractAddress:string, addr:string[]) => {
      console.log(4)
      const erc20 = new ethers.Contract(contractAddress, abi, provider);
      const balance = await erc20.balanceOf(addr);      
      let messageHash = ethers.utils.solidityKeccak256(
        ['address', 'uint256'],[addr, balance]
      );
      let messageHashBinary = ethers.utils.arrayify(messageHash);
      const sig = await signer.signMessage(messageHashBinary)
      return [addr, balance, sig];
    }
  }
], TOKEN_ADDRESS);
console.log(5)
const app = server.makeApp();
console.log(6)
app.listen(8080);