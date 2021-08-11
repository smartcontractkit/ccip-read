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
const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
let signer = new ethers.Wallet(PRIVATE_KEY);

server.add(abi, [
  {
    calltype: 'balanceOf',
    returntype: 'balanceOfWithProof',
    func: async (contractAddress:string, addresses:string[]) => {
      const addr = addresses[0]
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
const app = server.makeApp('/rpc');
app.listen(8080);