const durin = require('@ensdomains/durin');
const ethers = require('ethers');
const server = new durin.Server();
const fs = require('fs');
require('dotenv').config({ path: '../.env' })
const abi = JSON.parse(fs.readFileSync('../contracts/artifacts/contracts/Token.sol/Token.json', 'utf8')).abi

const{
  PROVIDER_URL,
  SIGNER_PRIVATE_KEY,
  ADDRESS_FILE_PATH
} = process.env
const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
let signer = new ethers.Wallet(SIGNER_PRIVATE_KEY);
console.log({
  PROVIDER_URL,
  SIGNER_ADDRESS:signer.address,
  ADDRESS_FILE_PATH
})


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
    func: async (args:string[], _context:any) => {
      const addr  = args[0]
      const balance = balances[addr] || 0
      let messageHash = ethers.utils.solidityKeccak256(
        ['uint256', 'address'],[balance, addr]
      );
      let messageHashBinary = ethers.utils.arrayify(messageHash);
      const signature = await signer.signMessage(messageHashBinary)
      return [addr, {balance, signature}];
    }
  },
  // function transferWithProof(address recipient, uint256 amount, BalanceProof memory proof) external returns(uint) {
  //   function transfer(address recipient, uint256 amount) public override returns (bool) {
  {
    calltype: 'transfer',
    returntype: 'transferWithProof',
    func: async (args:string[], context:any) => {
      // inputs: [
      //   '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
      //   BigNumber { _hex: '0x01', _isBigNumber: true },
      //   recipient: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
      //   amount: BigNumber { _hex: '0x01', _isBigNumber: true }
      // ]

      console.log({args, context})
      const [ recipient, amount ] = args
      const { from } = context
      const balance = balances[from] || 0
      let messageHash = ethers.utils.solidityKeccak256(
        ['uint256', 'address'],[balance, from]
      );
      let messageHashBinary = ethers.utils.arrayify(messageHash);
      const signature = await signer.signMessage(messageHashBinary)
      return [recipient, amount, {balance, signature}];
    }
  }
], '');
const app = server.makeApp('/rpc');
app.listen(8080);