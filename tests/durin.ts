import { expect } from 'chai';
import { ethers } from 'ethers';
import supertest from 'supertest';
// import { ethers } from 'ethers';
// import { defaultAbiCoder } from '@ethersproject/abi';
import { Server } from '../src/index';

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890';

async function doCall(server: Server, abi: string[], to: string, funcname: string, args: any[]) {
  const iface = new ethers.utils.Interface(abi);
  const handler = server.getHandler(to, iface.getSighash(funcname));
  if (handler === undefined) {
    throw Error('Unknown handler');
  }
  const calldata = iface.encodeFunctionData(funcname, args);
  const resultdata = await server.call([{ to, data: calldata }]);
  return iface.decodeFunctionData(handler.returntype, resultdata);
}

describe('Durin', () => {
  const abi = [
    'function balanceOf(address addr) public view returns(uint256)',
    'function balanceOfWithProof(address addr, uint256 balance) public view returns(uint256)',
  ];

  describe('function tests', () => {
    it('handles callback functions that return immediate values', async () => {
      const server = new Server();
      server.add(abi, [
        {
          calltype: 'balanceOf',
          returntype: 'balanceOfWithProof',
          func: (_, [addr]) => {
            return [addr, 123];
          },
        },
      ]);
      const result = await doCall(server, abi, TEST_ADDRESS, 'balanceOf', [TEST_ADDRESS]);
      expect(result.length).to.equal(2);
      expect(result[0]).to.equal(TEST_ADDRESS);
      expect(result[1].toNumber()).to.equal(123);
    });

    it('handles callback functions that return asynchronously', async () => {
      const server = new Server();
      server.add(abi, [
        {
          calltype: 'balanceOf',
          returntype: 'balanceOfWithProof',
          func: async (_, [addr]) => {
            return [addr, 123];
          },
        },
      ]);
      const result = await doCall(server, abi, TEST_ADDRESS, 'balanceOf', [TEST_ADDRESS]);
      expect(result.length).to.equal(2);
      expect(result[0]).to.equal(TEST_ADDRESS);
      expect(result[1].toNumber()).to.equal(123);
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

  describe('end-to-end tests', () => {
    it('exposes a JSON-RPC server', async () => {
      const server = new Server();
      server.add(abi, [
        {
          calltype: 'balanceOf',
          returntype: 'balanceOfWithProof',
          func: async (_, [addr]) => {
            return [addr, 123];
          },
        },
      ]);
      const app = server.makeApp('/rpc');
      const iface = new ethers.utils.Interface(abi);
      const calldata = iface.encodeFunctionData('balanceOf', [TEST_ADDRESS]);
      await supertest(app)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .send({
          jsonrpc: '2.0',
          method: 'durin_call',
          params: [{ to: TEST_ADDRESS, data: calldata }],
          id: 1,
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .then((response) => {
          expect(response.body.id).to.equal(1);
          expect(response.body.error).to.equal(undefined);
          const responsedata = iface.decodeFunctionData('balanceOfWithProof', response.body.result);
          expect(responsedata.length).to.equal(2);
          expect(responsedata[0]).to.equal(TEST_ADDRESS);
          expect(responsedata[1].toNumber()).to.equal(123);
        });
    });
  });
});
