pragma solidity ^0.8.7;
pragma abicoder v2;

interface OptimismResolverStubI{

  struct ChainBatchHeader {
    uint256 batchIndex;
    bytes32 batchRoot;
    uint256 batchSize;
    uint256 prevTotalElements;
    bytes extraData;
  }

  struct ChainInclusionProof {
    uint256 index;
    bytes32[] siblings;
  }

  struct L2StateProof {
    bytes32 stateRoot;
    ChainBatchHeader stateRootBatchHeader;
    ChainInclusionProof stateRootProof;
    bytes stateTrieWitness;
    bytes storageTrieWitness;
  }

  function gateway() external view returns(string memory);
  function l2resolver() external view returns(address);
  function addr(bytes32 node) external view returns(bytes memory prefix, string memory url);
  function addrWithProof(bytes32 node, L2StateProof memory proof) external view returns(address);
}
