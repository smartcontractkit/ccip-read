const durin = require('@ensdomains/durin');
const ethers = require('ethers');
const server = new durin.Server();
const fs = require('fs');
require('dotenv').config({ path: '../.env' });
const abi = JSON.parse(
  fs.readFileSync(
    '../contracts/artifacts/contracts/Token.sol/Token.json',
    'utf8'
  )
).abi;

const { SIGNER_PRIVATE_KEY, ADDRESS_FILE_PATH } = process.env;
let signer = new ethers.Wallet(SIGNER_PRIVATE_KEY);

const data = fs
  .readFileSync(ADDRESS_FILE_PATH, 'utf8')
  .split('\n')
  .slice(1) // Remove the header
  .map((d: string) => d.split(','))
  .filter((r: string[]) => r[0] !== '');

const balances = data.reduce((map: any, obj: any) => {
  const [key, val] = obj;
  map[key] = parseInt(val);
  return map;
}, {});
server.add(
  abi,
  [
    {
      calltype: 'balanceOf',
      returntype: 'balanceOfWithProof',
      func: async (args: string[], _context: any) => {
        const addr = args[0];
        const balance = balances[addr] || 0;
        let messageHash = ethers.utils.solidityKeccak256(
          ['uint256', 'address'],
          [balance, addr]
        );
        let messageHashBinary = ethers.utils.arrayify(messageHash);
        const signature = await signer.signMessage(messageHashBinary);
        return [addr, { balance, signature }];
      },
    },
    {
      calltype: 'transfer',
      returntype: 'transferWithProof',
      func: async (args: string[], context: any) => {
        const [recipient, amount] = args;
        const { from } = context;
        const balance = balances[from] || 0;
        let messageHash = ethers.utils.solidityKeccak256(
          ['uint256', 'address'],
          [balance, from]
        );
        let messageHashBinary = ethers.utils.arrayify(messageHash);
        const signature = await signer.signMessage(messageHashBinary);
        return [recipient, amount, { balance, signature }];
      },
    },
  ],
  ''
);
const app = server.makeApp('/rpc');
app.listen(8080);