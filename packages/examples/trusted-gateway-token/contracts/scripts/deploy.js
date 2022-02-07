// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const fs = require("fs")
const envfile = require('envfile')
const filename = '../.env'
const parsedFile = envfile.parse(fs.readFileSync(filename))

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const Token = await hre.ethers.getContractFactory("Token");
  const name = 'Test'
  const symbol = 'TXT'
  const urls = ['http://localhost:1989/', 'http://localhost:8080/']
  const signers = await ethers.getSigners();
  const initial_supply = 0;
  token = await Token.deploy(name, symbol, initial_supply);
  await token.setSigner(signers[0].address)
  await token.setUrls(urls)
  await token.deployed();

  console.log("Token deployed to:", token.address);
  console.log("The signer is set to:", signers[0].address);
  parsedFile.TOKEN_ADDRESS = token.address
  console.log("Saving as TOKEN_ADDRESS to:", filename);
  fs.writeFileSync(filename, envfile.stringify(parsedFile))
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
