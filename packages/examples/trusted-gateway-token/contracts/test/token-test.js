const { expect } = require("chai");
const { ethers } = require("hardhat");

const abiCoder = ethers.utils.defaultAbiCoder;

async function generateProof(signer, balance, address){
  const messageHash = ethers.utils.solidityKeccak256(
    ['uint', 'address'],[balance, address]
  );
  const messageHashBinary = ethers.utils.arrayify(messageHash);
  const signature = await signer.signMessage(messageHashBinary);
  return abiCoder.encode(['uint256', 'bytes'], [balance, signature]);
}

describe("Token", function () {
  let initial_supply, name, symbol, owner, tokensigner, account2, signers, Token, token, url
  before(async () => {
    initial_supply = 1
    name = 'Test'
    symbol = 'TXT'
    url = 'https://someurl.com'
    signers = await ethers.getSigners();
    [owner, tokensigner, account2] = signers
    Token = await ethers.getContractFactory("Token");
    token = await Token.deploy(name, symbol, initial_supply);
    await token.deployed();
  });

  it("initial attributes", async function () {
    expect(await token.name()).to.equal(name);
    expect(await token.owner()).to.equal(owner.address);
  });

  it("owner sets a signer", async function (){
    const tx = await token.setSigner(tokensigner.address);
    await tx.wait();
    expect(await token.getSigner()).to.equal(tokensigner.address);
  })

  it("owner sets a url", async function (){
    const tx = await token.setUrl(url);
    await tx.wait();
    expect(await token.url()).to.equal(url);
  })

  it("balanceOf throws OffchainLookup error", async function (){
    try {
      await token.balanceOf(owner.address);
    } catch (error) {
      console.log(error.message);
      expect(error.message).to.match(/OffchainLookup/)
    }
  })

  it("balanceOfWithSig", async function (){
    const balance = 2
    const proof = await generateProof(tokensigner, balance, account2.address)
    let newBalance = await token.balanceOfWithSig(proof, abiCoder.encode(['address'], [account2.address]));
    expect(newBalance).to.equal(balance);
  })

  it("transfer throws OffchainLookup error if not claimed", async function (){
    try {
      await token.transfer(owner.address, 1);
    } catch (error) {
      console.log(error.message);
      expect(error.message).to.match(/OffchainLookup/)
    }
  })

  it("transferWithSig transfers to recipient", async function (){
    let recipient = signers[5]
    let token2 = token.connect(account2)
    try {
      await token.balanceOf(recipient.address);
    } catch (error) {
      console.log(error.message);
      expect(error.message).to.match(/OffchainLookup/)
    }
    const balance = 2
    proof = await generateProof(tokensigner, balance, account2.address)
    await token2.transferWithSig(proof, abiCoder.encode(['address', 'uint256'], [recipient.address, balance]));
    const zeroProof = await generateProof(tokensigner, 0, recipient.address);
    const newBalance = await token.balanceOfWithSig(zeroProof, abiCoder.encode(['address'], [recipient.address]));
    expect(newBalance).to.equal(balance);
  })
});
