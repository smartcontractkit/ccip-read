pragma solidity ^0.7.6;

import "@openzeppelin/contracts/access/Ownable.sol";

contract OptimismResolver is Ownable {
    mapping(bytes32=>address) addresses;

    event AddrChanged(bytes32 indexed node, address a);

    function setAddr(bytes32 node, address addr) public onlyOwner {
        addresses[node] = addr;
        emit AddrChanged(node, addr);
    }

    function addr(bytes32 node) public view returns(address) {
        return addresses[node];
    }
}