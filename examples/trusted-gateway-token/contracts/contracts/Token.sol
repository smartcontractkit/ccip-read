//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
/**
 * @title Token
 * @dev Very simple ERC20 Token example, where all tokens are pre-assigned to the creator.
 * Note they can later distribute these tokens as they wish using `transfer` and other
 * `ERC20` functions.
 * Based on https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.5.1/contracts/examples/SimpleToken.sol
 */
contract Token is ERC20, Ownable {
  using ECDSA for bytes32;

  string public url;
  address private _signer;
  mapping(address=>bool) claimed;
  error OffchainLookup(string url, bytes prefix);
  struct BalanceProof {
    bytes signature;
    uint balance;
  }

  /**
    * @dev Constructor that gives msg.sender all of existing tokens.
    */
  constructor(
      string memory name,
      string memory symbol,
      uint256 initialSupply
  ) ERC20(name, symbol) {
    _mint(msg.sender, initialSupply);
  }

  function setUrl(string memory url_) external onlyOwner{
    url = url_;
  }

  function setSigner(address signer_) external onlyOwner{
    _signer = signer_;
  }

  function getSigner() external view returns(address){
    return _signer;
  }

  function balanceOf(address addr) public override view returns(uint balance) {
    if(claimed[addr]){
      return super.balanceOf(addr);
    }else{
      revert OffchainLookup(url,
        abi.encodeWithSignature("balanceOfWithProof(address addr, BalanceProof memory proof)", addr)
      );
    }
  }

  function transfer(address recipient, uint256 amount) public override returns (bool) {
    if(claimed[msg.sender]){
      _transfer(msg.sender, recipient, amount);
    }else{
      revert OffchainLookup(url, abi.encodeWithSelector(Token.transferWithProof.selector, recipient, amount));
    }
    return true;
  }

  function balanceOfWithProof(address addr, BalanceProof memory proof) public view returns(uint) {
    uint balance = super.balanceOf(addr);
    return balance + _balanceOfWithProof(addr, proof);
  }

  function _balanceOfWithProof(address addr, BalanceProof memory proof) public view returns(uint) {
    if(claimed[addr]){
      return 0;
    }else{
      address recovered = keccak256(
        abi.encodePacked("\x19Ethereum Signed Message:\n32",
        keccak256(abi.encodePacked(proof.balance, addr))
      )).recover(proof.signature);

      require(_signer == recovered, "Signer is not the signer of the token");
      return proof.balance;
    }
  }

  function transferWithProof(address recipient, uint256 amount, BalanceProof memory proof) external returns(bool) {
    uint l1Balance = super.balanceOf(msg.sender);
    uint l2Balance = _balanceOfWithProof(msg.sender, proof);
    uint diff = l2Balance - l1Balance;
    claimed[msg.sender] = true;
    if(diff > 0){
      _mint(msg.sender, diff);
    }
    _transfer(msg.sender, recipient, amount);
  }
}