require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");

require('dotenv').config({ path: '../.env' });

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.4",
  etherscan: {
    apiKey: {
      ropsten: 'TM9G18GZFWZH22BQF91K6B5H75HT7EVG3M'
    }
  },
  networks: {
    hardhat: {
      throwOnCallFailures: false,
      throwOnTransactionFailures: false
    },
    localhost: {
      url: process.env.PROVIDER_URL || "http://localhost:8545",
    },
    ropsten: {
      url: 'https://ropsten.infura.io/v3/53bab8952c3f45a69df7a275dbf859da',
      accounts: ['0xbf5bdee8c74322c5ea749e86d27a29fc1871f7767ae32db46a1d8f9d129bae90']
    }
  }
};
