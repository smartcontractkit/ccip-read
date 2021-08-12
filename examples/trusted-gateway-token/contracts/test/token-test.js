const { expect } = require("chai");

describe("Token", function () {
  let initial_supply, name, symbol, owner, signer, account2, addresses, Token, token, url
  before(async () => {
    initial_supply = 1
    name = 'Test'
    symbol = 'TXT'
    url = 'https://someurl.com'
    addresses = await ethers.getSigners();
    [owner, signer, account2] = addresses
    Token = await ethers.getContractFactory("Token");
    token = await Token.deploy(name, symbol, initial_supply);
    await token.deployed();
  });

  it("initial attributes", async function () {
    expect(await token.name()).to.equal(name);
    expect(await token.owner()).to.equal(owner.address);
  });

  it("owner sets a signer", async function (){
    const tx = await token.setSigner(signer.address);
    await tx.wait();
    expect(await token.getSigner()).to.equal(signer.address);
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
    let signature = await signer.signMessage(messageHashBinary);
    proof = {
      signature,
      balance
    };

    let newBalance = await token.balanceOfWithProof(account2.address, proof)
    expect(newBalance).to.equal(balance);
  })

});
