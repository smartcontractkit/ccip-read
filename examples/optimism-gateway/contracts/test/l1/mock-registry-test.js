const { expect } = require("chai");
const namehash = require('eth-ens-namehash');

describe("MockRegistry", function () {
  let owner, tokensigner, account2, signers
  before(async () => {
    signers = await ethers.getSigners();
    [owner, tokensigner, account2] = signers
    console.log({owner:owner.address})
    Registry = await ethers.getContractFactory("MockRegistry");
    registry = await Registry.deploy(owner.address);
    await registry.deployed();
  });

  it("initial attributes", async function () {
    let testNode = namehash.hash('test.eth');
    expect(await registry.owner(testNode)).to.equal(owner.address);
  });

});