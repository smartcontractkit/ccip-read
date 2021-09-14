require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
// require('@eth-optimism/plugins/hardhat/compiler');
// require('@eth-optimism/plugins/hardhat/ethers');
require('@eth-optimism/hardhat-ovm')
module.exports = {
  networks: {
    integration: {
      url: "http://localhost:9545/",
      l2url: "http://localhost:8545/"
    },
    optimistic: {
      url: 'http://127.0.0.1:8545',
      gasPrice: 15000000,          
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
        version: "0.7.6",
        settings: {},
      },
    ]
  },
};
