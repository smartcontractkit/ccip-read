const Web3 = require('web3');
const fs = require('fs');

require('dotenv').config({ path: '../.env' });

const abi = JSON.parse(
  fs.readFileSync(
    '../contracts/artifacts/contracts/Token.sol/Token.json',
    'utf8'
  )
).abi;

const { TOKEN_ADDRESS, PROVIDER_URL } = process.env;

const web3 = new Web3(PROVIDER_URL);
const erc20Contract = new web3.eth.Contract(abi, TOKEN_ADDRESS);

export async function web3Main() {
  // web3.eth.ccipReadGatewayCallback = async () => {
  //   console.log('hi from callback');
  //   return {}
  // }

  // web3.eth.Contract.ccipReadGatewayCallback = async () => {
  //   console.log('hi from callback');
  //   return {}
  // }

  // erc20Contract.ccipReadGatewayCallback = async () => {
  //   console.log('hi from callback');
  //   return {}
  // }

  // web3.eth.ccipReadGatewayUrls = ['http://localhost:9000']
  // web3.eth.Contract.ccipReadGatewayUrls = ['http://localhost:9001']
  erc20Contract.ccipReadGatewayUrls = ['https://localhost:8080'];

  let balance;
  try {
    balance = await erc20Contract.methods
      .balanceOf('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
      .call();
    console.log('balance: ', balance);
  } catch (e) {
    console.log('error: ', e);
  }
}
