pragma solidity ^0.8.7;
pragma abicoder v2;
import "./OptimismVerifierI.sol";

contract OptimismResolverStub {
  string public gateway;
  address public l2resolver;
  OptimismVerifierI public verifier;

  constructor(OptimismVerifierI _verifier, string memory _gateway, address _l2resolver) {
    verifier = _verifier;
    gateway = _gateway;
    l2resolver = _l2resolver;
  }

  // error OffchainLookup(bytes prefix, string url);

  function addr(bytes32 node) external view returns(address) {
    bytes memory prefix = abi.encodeWithSelector(OptimismResolverStub.addrWithProof.selector, node);
  //    revert OffchainLookup(prefix, gateway);
    bytes memory message = abi.encodeWithSignature("OffchainLookup(bytes,string)", prefix, gateway);
    assembly {
      revert(add(message,32), mload(message))
    }
  }

  function addrWithProof(bytes32 node, OptimismVerifierI.L2StateProof memory proof) external view returns(address) {
    bytes32 slot = keccak256(abi.encodePacked(node, uint256(1)));
    bytes32 value = verifier.getVerifiedValue(l2resolver, slot, proof);
    return address(uint160(uint256(value)));
  }
}

