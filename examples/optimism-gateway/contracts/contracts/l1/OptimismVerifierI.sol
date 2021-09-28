pragma solidity ^0.7.6;
pragma abicoder v2;

interface OptimismVerifierI{
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

  function getVerifiedValue(address l2resolver, bytes32 slot, L2StateProof memory proof) external view returns(bytes32);
}