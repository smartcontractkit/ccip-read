import { providers, Transaction } from 'ethers';

const ethers = require('ethers');
const fs = require('fs');

require('dotenv').config({ path: '../.env' });

const abi = JSON.parse(
  fs.readFileSync(
    '../contracts/artifacts/contracts/Token.sol/Token.json',
    'utf8'
  )
).abi;

const RECIPIENT = '0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199';
const { TOKEN_ADDRESS, PROVIDER_URL, SENDER_ACCOUNT_INDEX } = process.env;

class MyCustomProvider extends providers.JsonRpcProvider {
  async ccipReadFetch(
    tx: Transaction,
    calldata: string,
    urls: Array<string>
  ): Promise<null | string> {
    urls = urls.filter((u: any) => isSafeUrl(u));
    return super.ccipReadFetch(tx, calldata, urls);
  }
}

function isSafeUrl(url: string): boolean {
  console.log(`Allowing ${url}`);
  return true;
}

const provider = new MyCustomProvider(PROVIDER_URL);
const signer = provider.getSigner(parseInt(SENDER_ACCOUNT_INDEX as string));
const erc20 = new ethers.Contract(TOKEN_ADDRESS, abi, signer);

async function main() {
  const amount = 1;
  const sender = await signer.getAddress();

  console.log(`CCIP enabled: ${!provider.disableCcipRead}`);

  console.log(
    `SENDER ${sender} balance ${await erc20.balanceOf(sender, {
      ccipReadEnabled: true,
    })}`
  );
  console.log(
    `RECIPIENT ${RECIPIENT} balance ${await erc20.balanceOf(RECIPIENT, {
      ccipReadEnabled: true,
    })}`
  );
  console.log(`TRANSFER ${amount} from ${sender} to ${RECIPIENT}`);
  const tx = await erc20.transfer(RECIPIENT, amount);
  await tx.wait();
  console.log(
    `SENDER ${sender} balance ${await erc20.balanceOf(sender, {
      ccipReadEnabled: true,
    })}`
  );
  console.log(
    `RECIPIENT ${RECIPIENT} balance ${await erc20.balanceOf(RECIPIENT, {
      ccipReadEnabled: true,
    })}`
  );
}

main();
