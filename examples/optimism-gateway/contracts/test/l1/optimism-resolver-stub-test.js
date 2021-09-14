const { expect } = require("chai");
const { ethers } = require('hardhat');
const ethers2 = require('ethers');
const provider2 = new ethers2.providers.JsonRpcProvider('http://localhost:9545');

const { Signer, ContractFactory, Contract, BigNumber } = require('ethers');
const { keccak256 } = require('ethers/lib/utils');
const { smockit, MockContract } = require('@eth-optimism/smock');
const namehash = require('eth-ens-namehash');

const {
  NULL_BYTES32,
  DUMMY_BATCH_HEADERS,
  DUMMY_BATCH_PROOFS,
} = require('./helpers/constants');
const { TrieTestGenerator } = require('./helpers/trie-test-generator');
const { toHexString } = require('./helpers/utils');

const RESOLVER_ADDR = "0x0123456789012345678901234567890123456789";
const GATEWAY = "http://localhost:8080/query/" + RESOLVER_ADDR;

const setProxyTarget = async (AddressManager, name, target) => {
  const SimpleProxy = await (
    await ethers.getContractFactory('Helper_SimpleProxy')
  ).deploy()

  await SimpleProxy.setTarget(target.address)
  await AddressManager.setAddress(name, SimpleProxy.address)
}

const makeAddressManager = async () => {
  return (await ethers.getContractFactory('Lib_AddressManager')).deploy()
}

describe("OptimismResolverStub", function() {
  let signer;
  let account2;
  before(async () => {
    [signer, account2] = await ethers.getSigners()
  });

  let addressManager
  before(async () => {
    addressManager = await makeAddressManager()
  });

  let mock__OVM_CanonicalTransactionChain;
  let mock__OVM_StateCommitmentChain;
  before(async () => {
    mock__OVM_CanonicalTransactionChain = await smockit(
      await ethers.getContractFactory('OVM_CanonicalTransactionChain')
    );
    mock__OVM_StateCommitmentChain = await smockit(
      await ethers.getContractFactory('OVM_StateCommitmentChain')
    );

    await setProxyTarget(
      addressManager,
      'OVM_CanonicalTransactionChain',
      mock__OVM_CanonicalTransactionChain
    );
    await setProxyTarget(
      addressManager,
      'OVM_StateCommitmentChain',
      mock__OVM_StateCommitmentChain
    );
  });

  let Factory__OptimismResolverStub;
  before(async () => {
    Factory__OptimismResolverStub = await ethers.getContractFactory(
      'OptimismResolverStub'
    );
  });

  let stub;
  beforeEach(async () => {
    stub = await Factory__OptimismResolverStub.deploy(addressManager.address, GATEWAY, RESOLVER_ADDR);
    await stub.deployed();
  });

  it("Should return the gateway and contract address from the constructor", async function() {
    expect(await stub.l2resolver()).to.equal(RESOLVER_ADDR);
    expect(await stub.gateway()).to.equal(GATEWAY);
  });

  describe("stub", () => {
    let testAddress;
    let testNode;
    let proof;
    before(async () => {
      testAddress = await account2.getAddress();
      testNode = namehash.hash('test.eth');
      const storageKey = keccak256(
        testNode + '00'.repeat(31) + '01'
      )
      const storageGenerator = await TrieTestGenerator.fromNodes({
        nodes: [
          {
            key: storageKey,
            // 0x94 is the RLP prefix for a 20-byte string
            val: '0x94' + testAddress.substring(2),
          },
        ],
        secure: true,
      });

      const generator = await TrieTestGenerator.fromAccounts({
        accounts: [
          {
            address: RESOLVER_ADDR,
            nonce: 0,
            balance: 0,
            codeHash: keccak256('0x1234'),
            storageRoot: toHexString(storageGenerator._trie.root),
          },
        ],
        secure: true,
      });

      proof = {
        stateRoot: toHexString(generator._trie.root),
        stateRootBatchHeader: DUMMY_BATCH_HEADERS[0],
        stateRootProof: DUMMY_BATCH_PROOFS[0],
        stateTrieWitness: (await generator.makeAccountProofTest(RESOLVER_ADDR))
          .accountTrieWitness,
        storageTrieWitness: (
          await storageGenerator.makeInclusionProofTest(storageKey)
        ).proof,
      };
    })

    beforeEach(async () => {
      mock__OVM_StateCommitmentChain.smocked.verifyStateCommitment.will.return.with(
        true
      );
    })

    describe("addr", () => {
      it("should throw OffchainLookup error with gateway info", async function() {
        try{
          const abi = [
            'function addr(bytes32 node) view returns(address)',
            // 'error OffchainLookup(bytes32,string)'
            {
              "inputs": [
                {
                  "internalType": "bytes32",
                  "name": "prefix",
                  "type": "bytes32"
                },
                {
                  "internalType": "string",
                  "name": "url",
                  "type": "string"
                }
              ],
              "name": "OffchainLookup",
              "type": "error"
            }
          ]
          
          const iface = new ethers2.utils.Interface(abi);
          console.log('**1');
          const data = iface.encodeFunctionData('addr', [testNode]);
          console.log('**2', stub.address, data);
          const result = await provider2.call({
            to: stub.address,data
          });
          console.log('**3', result)


          // console.log('**4', iface.decodeFunctionResult('addr', result))
          // const contract = new ethers2.Contract(stub.address, abi, provider2);
          // await contract.addr([testNode])
          // stub = await Factory__OptimismResolverStub.deploy(addressManager.address, GATEWAY, RESOLVER_ADDR);
          // await stub.deployed();
      
          // await stub.addr(testNode)

        }catch(e){
          console.log('***4.1', e)
          console.log('***4.2', e.message)
          // expect(e.message).to.include(GATEWAY)
        }
      });
    })

    describe("addrWithProof", () => {
      it("should verify proofs of resolution results", async function() {
        expect(await stub.addrWithProof(testNode, proof)).to.equal(testAddress);
      });
    });
  })
});
