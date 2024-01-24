import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ethers } from 'ethers';
import supertest from 'supertest';
import { Server } from '../src/index';

chai.use(chaiAsPromised);

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890';

async function doCall(server: Server, abi: string[], to: string, funcname: string, args: any[]) {
  const iface = new ethers.utils.Interface(abi);
  const handler = server.handlers[iface.getSighash(funcname)];
  if (!handler) {
    throw Error('Unknown handler');
  }
  const calldata = iface.encodeFunctionData(funcname, args);
  const result = await server.call({ to, data: calldata });
  if (result.status !== 200) {
    throw Error(result.body.message);
  }
  if (handler.type.outputs !== undefined) {
    return iface.decodeFunctionResult(handler.type, result.body.data);
  } else {
    return [];
  }
}

describe('CCIP-Read', () => {
  const abi = ['function getSignedBalance(address addr) public view returns(uint256 balance, bytes sig)'];

  describe('server tests', () => {
    it('returns an error if the server throws an exception', async () => {
      const server = new Server();
      server.add(abi, [
        {
          type: 'getSignedBalance',
          func: (_args) => {
            return new Promise((_resolve, reject) => {
              reject(new Error('Test'));
            });
          },
        },
      ]);
      expect(doCall(server, abi, TEST_ADDRESS, 'getSignedBalance', [TEST_ADDRESS])).to.be.rejected;
    });
  });

  describe('function tests', () => {
    it('handles callback functions that return immediate values', async () => {
      const server = new Server();
      server.add(abi, [
        {
          type: 'getSignedBalance',
          func: (_args) => {
            return [123, '0x123456'];
          },
        },
      ]);
      const result = await doCall(server, abi, TEST_ADDRESS, 'getSignedBalance', [TEST_ADDRESS]);
      expect(result.length).to.equal(2);
      expect(result[0].toNumber()).to.equal(123);
      expect(result[1]).to.equal('0x123456');
    });

    it('handles callback functions that return asynchronously', async () => {
      const server = new Server();
      server.add(abi, [
        {
          type: 'getSignedBalance',
          func: (_args) => {
            return Promise.resolve([123, '0x123456']);
          },
        },
      ]);
      const result = await doCall(server, abi, TEST_ADDRESS, 'getSignedBalance', [TEST_ADDRESS]);
      expect(result.length).to.equal(2);
      expect(result[0].toNumber()).to.equal(123);
      expect(result[1]).to.equal('0x123456');
    });
  });

  describe('end-to-end tests', () => {
    it('answers GET requests', async () => {
      const server = new Server();
      server.add(abi, [
        {
          type: 'getSignedBalance',
          func: (_args) => {
            return Promise.resolve([123, '0x123456']);
          },
        },
      ]);
      const app = server.makeApp('/rpc/');
      const iface = new ethers.utils.Interface(abi);
      const calldata = iface.encodeFunctionData('getSignedBalance', [TEST_ADDRESS]);
      await supertest(app)
        .get(`/rpc/${TEST_ADDRESS}/${calldata}.json`)
        .expect(200)
        .expect('Content-Type', /json/)
        .then((response) => {
          const responsedata = iface.decodeFunctionResult('getSignedBalance', response.body.data);
          expect(responsedata.length).to.equal(2);
          expect(responsedata[0].toNumber()).to.equal(123);
          expect(responsedata[1]).to.equal('0x123456');
        });
    });

    it('answers POST requests', async () => {
      const server = new Server();
      server.add(abi, [
        {
          type: 'getSignedBalance',
          func: (_args) => {
            return Promise.resolve([123, '0x123456']);
          },
        },
      ]);
      const app = server.makeApp('/rpc/');
      const iface = new ethers.utils.Interface(abi);
      const calldata = iface.encodeFunctionData('getSignedBalance', [TEST_ADDRESS]);
      await supertest(app)
        .post('/rpc/')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .send({
          'sender': TEST_ADDRESS,
          'data': calldata
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .then((response) => {
          const responsedata = iface.decodeFunctionResult('getSignedBalance', response.body.data);
          expect(responsedata.length).to.equal(2);
          expect(responsedata[0].toNumber()).to.equal(123);
          expect(responsedata[1]).to.equal('0x123456');
        });
    });

    it('returns a 404 for undefined functions', async () => {
      const server = new Server();
      const app = server.makeApp('/rpc/');
      const iface = new ethers.utils.Interface(abi);
      const calldata = iface.encodeFunctionData('getSignedBalance', [TEST_ADDRESS]);
      await supertest(app)
        .get(`/rpc/${TEST_ADDRESS}/${calldata}.json`)
        .set('Accept', 'application/json')
        .expect(404)
        .expect('Content-Type', /json/)
        .then((response) => {
          expect(response.body.message).to.equal('No implementation for function with selector 0xce938715');
        });
    });

    it('returns a 400 for invalid fields', async () => {
      const server = new Server();
      const app = server.makeApp('/rpc/');
      await supertest(app)
        .get(`/rpc/${TEST_ADDRESS}/blah.json`)
        .set('Accept', 'application/json')
        .expect(400)
        .expect('Content-Type', /json/)
        .then((response) => {
          expect(response.body.message).to.equal('Invalid request format');
        });
    });
  });

  describe('multicall tests', () => {
    const multicall_iface = new ethers.utils.Interface([
      'function multicall(bytes[] calldata data) external returns (bytes[] memory results)'
    ]);
    const multicall_frag = multicall_iface.getFunction('multicall');
    const test_iface = new ethers.utils.Interface([
      'function aaa(uint256 x) external returns (uint256)',
      'function bbb(string y, uint256 z) external returns (uint256, string)',
    ]);
    it('answers multiple requests', async () => {
      const server = new Server();
      server.add(test_iface, [
        {
          type: 'aaa',
          func([x]) { return [x.toNumber() + 1]; }
        },
        {
          type: 'bbb',
          func([y, z]) { return [z.toNumber() + 1, y.toUpperCase()]; }
        },
      ]);
      const app = server.makeApp('/rpc/');
      const calls = [
        {
          type: 'aaa',
          args: [1],
          check(v: ethers.utils.Result) {
            expect(v.length).to.equal(1);
            expect(v[0].toNumber()).to.equal(2);
          }
        },
        {
          type: 'bbb',
          args: ['abc', 2],
          check(v: ethers.utils.Result) {
            expect(v.length).to.equal(2);
            expect(v[0].toNumber()).to.equal(3);
            expect(v[1]).to.equal("ABC");
          }
        }
      ];
      const calldata = multicall_iface.encodeFunctionData(multicall_frag, [calls.map(x => {
        return test_iface.encodeFunctionData(x.type, x.args);
      })]);
      await supertest(app)
        .post('/rpc/')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .send({
          'sender': TEST_ADDRESS,
          'data': calldata
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .then((response) => {
          const calldata = multicall_iface.decodeFunctionResult(multicall_frag, response.body.data);
          expect(calldata.length).to.equal(1);
          expect(calldata[0].length).to.equal(calls.length);
          calls.forEach((x, i) => x.check(test_iface.decodeFunctionResult(x.type, calldata[0][i])));
        });
    });
  });
});
