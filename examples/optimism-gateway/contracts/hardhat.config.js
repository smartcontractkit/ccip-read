require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require('@eth-optimism/hardhat-ovm')
const sources = process.env.IS_OPTIMISM ? "./contracts/l2" : "./contracts/l1"
const MNEMONIC = process.env.MNEMONIC || 'test test test test test test test test test test test junk'
const INFURA_API_KEY = process.env.INFURA_API_KEY
module.exports = {
  paths: {
    sources
  },
  networks: {
    local: {
      url: "http://localhost:9545/",
      gasPrice: 15000000
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${INFURA_API_KEY}`,
      // gasPrice: 15000000,
      gas: 3000000,
      accounts: { mnemonic: MNEMONIC }
    },
    optimistickovan: {
      url: 'https://kovan.optimism.io',
      gasPrice: 15000000,
      accounts: { mnemonic: MNEMONIC },
      ovm: true // This sets the network as using the ovm and ensure contract will be compiled against that.
    },
    optimisticlocal: {
      url: 'http://127.0.0.1:8545',
      gasPrice: 15000000,
      accounts: { mnemonic: MNEMONIC },
      ovm: true // This sets the network as using the ovm and ensure contract will be compiled against that.
    },
    optimisticmain: {
      url: 'https://mainnet.optimism.io',
      gasPrice: 15000000,
      accounts: { mnemonic: MNEMONIC },
      ovm: true // This sets the network as using the ovm and ensure contract will be compiled against that.
    }
  },
  namedAccounts: {
    deployer: {
      default: 0
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.8.7",
        settings: {},
      },
      {
        version: "0.7.6",
        settings: {},
      }

    ]
  },
};
