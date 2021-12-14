//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IToken {
    function balanceOf(address owner) external view returns(uint256);
}

contract RevertProxy {
    // Calls a contract and returns the data regardless of whether it's a revert or not.
    function call(address payable target, bytes calldata data) external payable returns(bytes memory) {
        (, bytes memory response) = target.call{value:msg.value}(data);
        return response;
    }

    // Utility function to test passing through reverts from another contract.
    function balanceOf(IToken token, address owner) external view returns(uint256) {
        return token.balanceOf(owner);
    }
}
