import 'isomorphic-fetch';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ethers } from 'ethers';
import { Server } from '../src/index';

chai.use(chaiAsPromised);

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890';

const buildRequest = ({ method = 'GET', path, url = `http://localhost${path}`, ...rest }: any) => {
  return new Request(url, {
    method,
    ...rest,
    ...(rest?.body && { body: JSON.stringify(rest.body)}),
  })
};

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
    it('welcome GET requests', async () => {
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
      const result = await app.handle(buildRequest({ path: `/rpc` }));
      expect(await result.text()).to.equal('hey ho!');
    });

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
      const response = await app.handle(buildRequest({ path: `/rpc/${TEST_ADDRESS}/${calldata}.json` }));
      const result = await response.json();
      const responsedata = iface.decodeFunctionResult('getSignedBalance', result.data);
      expect(responsedata.length).to.equal(2);
      expect(responsedata[0].toNumber()).to.equal(123);
      expect(responsedata[1]).to.equal('0x123456');
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
      const app = server.makeApp('/rpc');
      const iface = new ethers.utils.Interface(abi);
      const calldata = iface.encodeFunctionData('getSignedBalance', [TEST_ADDRESS]);
      const headers = new Headers();
      headers.append('Accept', 'application/json');
      const response = await app.handle(
        buildRequest({
          path: `/rpc`,
          method: 'POST',
          body: {
            sender: TEST_ADDRESS,
            data: calldata,
          },
          headers,
        })
      );
      const result = await response.json();
      const responsedata = iface.decodeFunctionResult('getSignedBalance', result.data);
      expect(responsedata.length).to.equal(2);
      expect(responsedata[0].toNumber()).to.equal(123);
      expect(responsedata[1]).to.equal('0x123456');
    });

    it('returns a 404 for undefined functions', async () => {
      const server = new Server();
      const app = server.makeApp('/rpc/');
      const iface = new ethers.utils.Interface(abi);
      const calldata = iface.encodeFunctionData('getSignedBalance', [TEST_ADDRESS]);
      const response = await app.handle(
        buildRequest({
          path: `/rpc/${TEST_ADDRESS}/${calldata}.json`
        })
      );
      const result = await response.json();
      expect(result.message).to.equal('No implementation for function with selector 0xce938715')
    });

    it('returns a 400 for invalid fields', async () => {
      const server = new Server();
      const app = server.makeApp('/rpc/');
      const response = await app.handle(
        buildRequest({
          path: `/rpc/${TEST_ADDRESS}/blah.json`,
        })
      );
      const result = await response.text();
      expect(result).to.equal('Invalid request format');
    });
  });
});
