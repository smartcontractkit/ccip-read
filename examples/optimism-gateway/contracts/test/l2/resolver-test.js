const { expect } = require("chai");

const NODE = "0xeb4f647bea6caa36333c816d7b46fdcb05f9466ecacc140ea8c66faf15b3d9f1"; // namehash('test.eth')

describe("OptimismResolver", function() {
  it("Should return an address once set", async function() {
    const accounts = await ethers.getSigners();
    const address = await accounts[0].getAddress();

    const Resolver = await ethers.getContractFactory("OptimismResolver");
    const resolver = await Resolver.deploy();
    await resolver.deployed();

    await resolver.setAddr(NODE, address);
    expect(await resolver.addr(NODE)).to.equal(address);
  });
});
