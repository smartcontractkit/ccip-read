const ethers = require('ethers');
const Web3 = require('web3');
const ccipread = require('@chainlink/ethers-ccip-read-provider');
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

const provider = new ccipread.CCIPReadProvider(
  new ethers.providers.JsonRpcProvider(PROVIDER_URL)
);
// const signer = provider.getSigner(parseInt(SENDER_ACCOUNT_INDEX as string));
const signer = '0xfEed2025B65CDfCb6d941314897544b23B5860a1';
const erc20 = new ethers.Contract(TOKEN_ADDRESS, abi, signer);
// console.log('web3.eth: ', Web3)

const web3 = new Web3(PROVIDER_URL)
web3.eth.handleRevert = false
const erc20Contract = new web3.eth.Contract(abi, TOKEN_ADDRESS);

async function main() {
  // const amount = 1;
  // const sender = await signer.getAddress();

  // console.log('signer:', signer)

  // console.log(`SENDER ${sender} balance ${await erc20.balanceOf(sender)}`);
  // console.log(
  //   `RECIPIENT ${RECIPIENT} balance ${await erc20.balanceOf(RECIPIENT)}`
  // );
  // console.log(`TRANSFER ${amount} from ${sender} to ${RECIPIENT}`);
  // const tx = await erc20.transfer(RECIPIENT, amount);
  // await tx.wait();
  // console.log(`SENDER ${sender} balance ${await erc20.balanceOf(sender)}`);
  // console.log(
  //   `RECIPIENT ${RECIPIENT} balance ${await erc20.balanceOf(RECIPIENT)}`
  // );


  // await erc20Contract.methods.balanceOf(accounts[0]).call({from: accounts[0]})

  // erc20Contract.methods.balanceOf(accounts[0]).call({
  //   from: accounts[0],
  //   function(error: any, result: any) {
  //     console.log('error: ', error)
  //     console.log('result: ', result)
  //   }
  // });

  //web3js version
  // const accounts = await web3.eth.getAccounts();

  erc20Contract.handleRevert = true
  erc20Contract.options.handleRevert = true

  let balance
  try {
    balance = await erc20Contract.methods.balanceOf('0xfEed2025B65CDfCb6d941314897544b23B5860a1').call();
    // balance = await erc20Contract.methods.balanceOf(accounts[0]).call();

    // await erc20Contract.methods.transfer(RECIPIENT, 1).send({
    //   from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
    // });

    // await erc20Contract.methods.transfer(RECIPIENT, 1).send({
    //   from: accounts[0]
    // });

    // balance = await erc20Contract.methods.balanceOf(accounts[0]).call();
    console.log('balance: ', balance)
    // balance = await erc20Contract.methods.balanceOf('sdfs').call();
  } catch(e) {
    console.log('error: ', e)
  }
  // console.log(`${JSON.stringify(balance)}`)
}

main()
  .then(x => {
    console.log('finished: ', x)
  })
  .catch(e => {
    console.log('error: ', e)
  })

// main().catch(error => console.error('error: ', error))

//   .catch(e => {
//   console.log('error')
//   console.log(e)
// });
