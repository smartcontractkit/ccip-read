const { expect } = require("chai");

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

  it("balanceOfWithProof", async function (){
    const balance = 2
    messageHash = ethers.utils.solidityKeccak256(
      ['uint', 'address'],[balance, account2.address]
    );
    let messageHashBinary = ethers.utils.arrayify(messageHash);
    let signature = await tokensigner.signMessage(messageHashBinary);
    proof = {
      signature,
      balance
    };

    let newBalance = await token.balanceOfWithProof(account2.address, proof)
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

  it("transferWithProof transfers to self", async function (){
    let recipient = signers[5]
    let token2 = token.connect(account2)
    try {
      await token.balanceOf(account2.address);
    } catch (error) {
      console.log(error.message);
      expect(error.message).to.match(/OffchainLookup/)
    }
    const balance = 2
    messageHash = ethers.utils.solidityKeccak256(
      ['uint', 'address'],[balance, account2.address]
    );
    let messageHashBinary = ethers.utils.arrayify(messageHash);
    let signature = await tokensigner.signMessage(messageHashBinary);
    proof = {
      signature,
      balance
    };
    await token2.transferWithProof(account2.address, balance, proof)
    const newBalance = await token.balanceOf(account2.address);
    expect(newBalance).to.equal(balance);
  })
});
