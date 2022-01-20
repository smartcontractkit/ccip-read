import { Server } from '@chainlink/ccip-read-server';
import { ethers, BigNumber } from 'ethers';
import fs from 'fs';

const abi = JSON.parse(
  fs.readFileSync(
    '../contracts/artifacts/contracts/Token.sol/Gateway.json',
    'utf8'
  )
).abi;

const data = fs
  .readFileSync('addresses.csv', 'utf8')
  .split('\n')
  .slice(1) // Remove the header
  .map((d: string) => d.split(','))
  .filter((r: string[]) => r[0] !== '');

const balances = data.reduce((map: any, obj: any) => {
  const [key, val] = obj;
  map[key] = BigNumber.from(val);
  return map;
}, {});

export function makeApp(privateKey: string, path: string) {
  let signer = new ethers.Wallet(privateKey);
  const server = new Server();
  server.add(abi, [
    {
      type: 'getSignedBalance',
      func: async (args: ethers.utils.Result) => {
        const [addr] = args;
        const balance = balances[addr.toLowerCase()] || 0;
        let messageHash = ethers.utils.solidityKeccak256(
          ['uint256', 'address'],
          [balance, addr]
        );
        let messageHashBinary = ethers.utils.arrayify(messageHash);
        const signature = await signer.signMessage(messageHashBinary);
        return [balance, signature];
      },
    },
  ]);
  return server.makeApp(path);
}
