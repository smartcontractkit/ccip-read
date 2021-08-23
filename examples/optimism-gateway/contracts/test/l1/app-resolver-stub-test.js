const { expect } = require("chai");
const { ethers } = require('hardhat');
const { Signer, ContractFactory, Contract, BigNumber } = require('ethers');
const { keccak256 } = require('ethers/lib/utils');
const namehash = require('eth-ens-namehash');

const { toHexString } = require('./helpers/utils');

const GATEWAY = "http://localhost:8080/query/";

describe("AppResolverStub", function() {
  let signer;
  let account2;
  before(async () => {
    [signer, account2] = await ethers.getSigners()
  });

  let Factory__AppResolverStub;
  let Factory_MockRegistry;
  before(async () => {
    Factory__AppResolverStub = await ethers.getContractFactory(
      'AppResolverStub'
    );
    Factory_MockRegistry = await ethers.getContractFactory(
      'MockRegistry'
    );
  });

  let stub, ownerAddress;
  beforeEach(async () => {
    ownerAddress = await signer.getAddress(ownerAddress)
    registry = await Factory_MockRegistry.deploy(ownerAddress)
    stub = await Factory__AppResolverStub.deploy(registry.address, GATEWAY);
    await stub.deployed();
  });

  it("Should return the gateway and contract address from the constructor", async function() {
    let testNode = namehash.hash('test.eth');
    expect(await registry.owner(testNode)).to.equal(ownerAddress);
    expect(await stub.gateway()).to.equal(GATEWAY);
  });

  describe("addrWithProof", () => {
    let testAddress;
    let testNode;
    let proof;
    let messageHash;
    before(async () => {
      testNode = namehash.hash('test.eth');
    })

    it("should verify proofs of resolution results", async function() {
      messageHash = ethers.utils.solidityKeccak256(
        ['bytes32', 'address'],[testNode, account2.address]
      );
      let messageHashBinary = ethers.utils.arrayify(messageHash);
      let signature = await signer.signMessage(messageHashBinary);
      proof = {
        signature,
        addr:account2.address
      };

      let newAddress = await stub.addrWithProof(testNode, proof)
      expect(newAddress).to.equal(account2.address);
    });

    it("should not verify proofs if signature is not signed with address", async function() {
      messageHash = ethers.utils.solidityKeccak256(
        // Missing address
        ['bytes32'],[testNode]
      );
      let messageHashBinary = ethers.utils.arrayify(messageHash);
      let signature = await signer.signMessage(messageHashBinary);
      proof = {
        signature,
        addr:account2.address
      };

      try {
        await stub.addrWithProof(testNode, proof);
      } catch (error) {
        console.log(error.message);
        expect(error.message).to.match(/Signer is not the domain owner/)
      }
    });

    it("should not verify proofs if address is missing", async function() {
      messageHash = ethers.utils.solidityKeccak256(
        ['bytes32', 'address'],[testNode, account2.address]
      );
      let messageHashBinary = ethers.utils.arrayify(messageHash);
      let signature = await signer.signMessage(messageHashBinary);
      proof = {
        signature,
        addr:signer.address // use the address not used for message hash
      };

      try {
        await stub.addrWithProof(testNode, proof);
      } catch (error) {
        console.log(error.message);
        expect(error.message).to.match(/Signer is not the domain owner/)
      }
    });

    it("should not verify proofs if signed by non domain owner", async function() {
      messageHash = ethers.utils.solidityKeccak256(
        ['bytes32', 'address'],[testNode, account2.address]
      );
      let messageHashBinary = ethers.utils.arrayify(messageHash);
      // account2 is not the owner of `test.test`
      let signature = await account2.signMessage(messageHashBinary);
      proof = {
        signature,
        addr:account2.address
      };

      try {
        await stub.addrWithProof(testNode, proof);
      } catch (error) {
        console.log(error.message);
        expect(error.message).to.match(/Signer is not the domain owner/)
      }
    });
  });
});
