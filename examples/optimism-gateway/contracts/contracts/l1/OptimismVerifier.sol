pragma solidity ^0.7.6;
pragma abicoder v2;

import { Lib_AddressResolver } from "@eth-optimism/contracts/libraries/resolver/Lib_AddressResolver.sol";
import { Lib_OVMCodec } from "@eth-optimism/contracts/libraries/codec/Lib_OVMCodec.sol";
import { Lib_SecureMerkleTrie } from "@eth-optimism/contracts/libraries/trie/Lib_SecureMerkleTrie.sol";
import { IStateCommitmentChain } from "@eth-optimism/contracts/L1/rollup/IStateCommitmentChain.sol";
import { Lib_RLPReader } from "@eth-optimism/contracts/libraries/rlp/Lib_RLPReader.sol";
import { Lib_BytesUtils } from "@eth-optimism/contracts/libraries/utils/Lib_BytesUtils.sol";

contract OptimismVerifier is Lib_AddressResolver {
  string public gateway;
  address public l2resolver;

  struct L2StateProof {
    bytes32 stateRoot;
    Lib_OVMCodec.ChainBatchHeader stateRootBatchHeader;
    Lib_OVMCodec.ChainInclusionProof stateRootProof;
    bytes stateTrieWitness;
    bytes storageTrieWitness;
  }

  constructor(address ovmAddressManager) Lib_AddressResolver(ovmAddressManager) {
  }

  function getVerifiedValue(address l2resolver, bytes32 slot, L2StateProof memory proof) external  returns(bytes32){
    require(verifyStateRootProof(proof), "Invalid state root");
    return getStorageValue(l2resolver, slot, proof);
  }

  function verifyStateRootProof(L2StateProof memory proof) internal  returns(bool) {
    IStateCommitmentChain ovmStateCommitmentChain = IStateCommitmentChain(resolve("StateCommitmentChain"));
    return ovmStateCommitmentChain.verifyStateCommitment(proof.stateRoot, proof.stateRootBatchHeader, proof.stateRootProof);
  }

  function getStorageValue(address target, bytes32 slot, L2StateProof memory proof) internal  returns(bytes32) {
    (bool exists, bytes memory encodedResolverAccount) = Lib_SecureMerkleTrie.get(abi.encodePacked(target), proof.stateTrieWitness, proof.stateRoot);
    require(exists, "Account does not exist");
    Lib_OVMCodec.EVMAccount memory account = Lib_OVMCodec.decodeEVMAccount(encodedResolverAccount);
    (bool storageExists, bytes memory retrievedValue) = Lib_SecureMerkleTrie.get(abi.encodePacked(slot), proof.storageTrieWitness, account.storageRoot);
    require(storageExists, "Storage value does not exist");
    return Lib_BytesUtils.toBytes32PadLeft( Lib_RLPReader.readBytes(retrievedValue));
  }
}
