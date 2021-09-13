pragma solidity ^0.8.0;
pragma abicoder v2;

import "./OptimismResolverStubI.sol";

contract OptimismResolverWrapper {
  error OffchainLookup(int prefix, string url);

  OptimismResolverStubI public resolver;

  constructor(OptimismResolverStubI _resolverAddress) {
    resolver = _resolverAddress;
  }

  function addr(bytes32 node) external view returns(address) {
    // (bytes memory prefix, string memory url) = resolver.addr(node);
    (bytes memory prefix, string memory url) = resolver.addr(node);
    revert OffchainLookup(1, url);
  }

  function addrWithProof(bytes32 node, OptimismResolverStubI.L2StateProof memory proof) external view returns(address) {
    return resolver.addrWithProof(node, proof);
  }
}
