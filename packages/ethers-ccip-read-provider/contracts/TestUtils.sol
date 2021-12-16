//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IToken {
    function balanceOf(address owner) external view returns(uint256);
}

contract TestUtils {
    // Utility function to test passing through reverts from another contract.
    function balanceOf(IToken token, address owner) external view returns(uint256) {
        return token.balanceOf(owner);
    }
}
