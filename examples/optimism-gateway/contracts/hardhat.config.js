require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
// require('@eth-optimism/plugins/hardhat/compiler');
// require('@eth-optimism/plugins/hardhat/ethers');

module.exports = {
  networks: {
    integration: {
      url: "http://localhost:9545/",
      l2url: "http://localhost:8545/"
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
        version: "0.8.4",
      },
      {
        version: "0.7.6",
        settings: {},
      },
    ]
  },
};
