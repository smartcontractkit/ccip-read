//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@openzeppelin/contracts/access/Ownable.sol';

interface Gateway {
    function getSignedBalance(address addr) external view returns (uint256 balance, bytes memory sig);
}

interface IToken {
    function balanceOf(address owner) external view returns (uint256);
}

error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData);

contract TestMaxRetry is Ownable {
    string[] public urls;

    // Utility function revert both in balanceOf and callbackFunction to test maxRetry.
    function balanceOf(address owner) external view returns (uint256) {
        // assuming things went wrong
        revert OffchainLookup(
            address(this),
            urls,
            abi.encodeWithSelector(Gateway.getSignedBalance.selector, owner),
            TestMaxRetry.balanceOfWithSig.selector,
            abi.encode(owner)
        );
    }

    function setUrls(string[] memory urls_) external onlyOwner {
        urls = urls_;
    }

    function balanceOfWithSig(bytes calldata result, bytes calldata extraData) external view returns (uint256) {
        address addr = abi.decode(extraData, (address));
        // assuming things went wrong
        revert OffchainLookup(
            address(this),
            urls,
            abi.encodeWithSelector(Gateway.getSignedBalance.selector, addr),
            TestMaxRetry.balanceOfWithSig.selector,
            abi.encode(addr)
        );
    }
}
