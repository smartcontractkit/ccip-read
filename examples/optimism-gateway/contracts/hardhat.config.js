const fs = require('fs');
const envfile = require('envfile');
const ethers = require('ethers');
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
// require("@nomiclabs/hardhat-etherscan");

const parsedFile = envfile.parse(fs.readFileSync('./.env'))
const MNEMONIC = parsedFile.MNEMONIC || 'test test test test test test test test test test test junk'
const wallet =  ethers.Wallet.fromMnemonic(MNEMONIC);
const INFURA_API_KEY = parsedFile.INFURA_API_KEY
const ETHERSCAN_API = parsedFile.ETHERSCAN_API
module.exports = {
  networks: {
    hardhat:{
      throwOnCallFailures:false
    },
    local: {
      url: "http://localhost:9545/"
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [wallet.privateKey]
    },
    optimistickovan: {
      url: 'https://kovan.optimism.io',
      accounts: { mnemonic: MNEMONIC }
    },
    optimisticlocal: {
      url: 'http://127.0.0.1:8545',
      accounts: { mnemonic: MNEMONIC },
      gasPrice: 15000000
    },
    optimisticmain: {
      url: 'https://mainnet.optimism.io',
      gasPrice: 15000000,
      accounts: { mnemonic: MNEMONIC }
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API
  },
  namedAccounts: {
    deployer: {
      default: 0
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.8.9",
        settings: {},
      },
      {
        version: "0.7.6",
        settings: {},
      }
    ]
  },
};
