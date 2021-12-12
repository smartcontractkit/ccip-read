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
  if (handler === undefined) {
    throw Error('Unknown handler');
  }
  const calldata = iface.encodeFunctionData(funcname, args);
  const result = await server.call({ id: '1', data: { to, data: calldata } });
  if (result.statusCode === 200) {
    return iface.decodeFunctionResult(handler.type, result.data.result);
  } else {
    throw result.error;
  }
}

describe('Durin', () => {
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
    it('exposes a JSON-RPC server', async () => {
      const server = new Server();
      server.add(abi, [
        {
          type: 'getSignedBalance',
          func: (_args) => {
            return Promise.resolve([123, '0x123456']);
          },
        },
      ]);
      const app = server.makeApp('/rpc');
      const iface = new ethers.utils.Interface(abi);
      const calldata = iface.encodeFunctionData('getSignedBalance', [TEST_ADDRESS]);
      await supertest(app)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .send({
          id: '1',
          data: {
            to: TEST_ADDRESS,
            data: calldata,
          },
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .then((response) => {
          expect(response.body.jobRunID).to.equal('1');
          expect(response.body.statusCode).to.equal(200);
          expect(response.body.error).to.equal(undefined);
          const responsedata = iface.decodeFunctionResult('getSignedBalance', response.body.data.result);
          expect(responsedata.length).to.equal(2);
          expect(responsedata[0].toNumber()).to.equal(123);
          expect(responsedata[1]).to.equal('0x123456');
        });
    });

    it('returns a 404 for undefined functions', async () => {
      const server = new Server();
      const app = server.makeApp('/rpc');
      const iface = new ethers.utils.Interface(abi);
      const calldata = iface.encodeFunctionData('getSignedBalance', [TEST_ADDRESS]);
      await supertest(app)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .send({
          id: '1',
          data: {
            to: TEST_ADDRESS,
            data: calldata,
          },
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .then((response) => {
          expect(response.body.jobRunID).to.equal('1');
          expect(response.body.statusCode).to.equal(404);
          expect(response.body.error).to.not.equal(undefined);
          expect(response.body.error.name).to.equal('FunctionNotFound');
        });
    });

    it('returns a 400 for missing fields', async () => {
      const server = new Server();
      const app = server.makeApp('/rpc');
      const iface = new ethers.utils.Interface(abi);
      const calldata = iface.encodeFunctionData('getSignedBalance', [TEST_ADDRESS]);
      await supertest(app)
        .post('/rpc')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .send({
          id: '1',
          data: {
            data: calldata,
          },
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .then((response) => {
          expect(response.body.jobRunID).to.equal('1');
          expect(response.body.statusCode).to.equal(400);
          expect(response.body.error).to.not.equal(undefined);
          expect(response.body.error.name).to.equal('InvalidRequest');
        });
    });
  });
});
