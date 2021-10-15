pragma solidity ^0.7.6;
pragma abicoder v2;


contract MockRegistry {
    address ownerAddress;

    constructor(address _ownerAddress) public {
        ownerAddress = _ownerAddress;
    }

    function owner(bytes32 _node) public view returns (address) {
        return ownerAddress;
    }
}