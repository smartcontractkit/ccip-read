import { expect } from 'chai';
// import { ethers } from 'ethers';
// import { defaultAbiCoder } from '@ethersproject/abi';
import { Server } from '../src/index';

describe('Durin', () => {
  it('handles callback functions that return immediate values', () => {
    const server = new Server();
    const abi = [
      'function balanceOf(address addr) public view returns(uint256)',
      'function balanceOfWithProof(address addr, uint256 balance) public view returns(uint256)',
    ];
    server.add(abi, [
      {
        calltype: 'balanceOf',
        returntype: 'balanceOfWithProof',
        func: (_, [addr]) => {
          return [addr, 123];
        },
      },
    ]);
  });

  it('handles callback functions that return asynchronously', () => {
    const server = new Server();
    const abi = [
      'function balanceOf(address addr) public view returns(uint256)',
      'function balanceOfWithProof(address addr, uint256 balance) public view returns(uint256)',
    ];
    server.add(abi, [
      {
        calltype: 'balanceOf',
        returntype: 'balanceOfWithProof',
        func: async (_, [addr]) => {
          return [addr, 123];
        },
      },
    ]);
  });

  it('requires call and return functions to have the same return type', () => {
    const server = new Server();
    const abi = [
      'function balanceOf(address addr) public view returns(uint256)',
      'function balanceOfWithProof(address addr) public view returns(bytes32)',
    ];
    expect(() =>
      server.add(abi, [
        {
          calltype: 'balanceOf',
          returntype: 'balanceOfWithProof',
          func: (_, [addr]) => {
            return [addr];
          },
        },
      ])
    ).to.throw('Return types of balanceOf and balanceOfWithProof do not match');
  });
});
