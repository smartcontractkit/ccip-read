import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import supertest from 'supertest';
import { Server } from '../src/index';
import { FunctionFragment, Interface, Result, defaultAbiCoder } from 'ethers/lib/utils';

chai.use(chaiAsPromised);
const TEST_ADDRESS = '0x1234567890123456789012345678901234567890';

async function doCall(server: Server, abi: string[], to: string, funcname: string, args: any[]) {
  const iface = new Interface(abi);
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
      const iface = new Interface(abi);
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
      const iface = new Interface(abi);
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
      const iface = new Interface(abi);
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

  describe('multicall() tests', () => {
    
    type Ok = (args: any[], res: Result) => void;
    type Err = (args: any[], data: string) => void;
    class Impl {
      iface: Interface;
      frag: FunctionFragment;
      f: (args: any[]) => any;
      ok: Ok;
      err: Err;
      constructor(solc: string, f: (...args: any) => any, ok: Ok, err: Err) {
        this.iface = new Interface([solc]);
        this.frag = this.iface.fragments[0] as FunctionFragment;
        this.f = f;
        this.ok = ok;
        this.err = err;
      }
    }

    const unexpected = () => expect.fail("unexpected failure");
    const inc0 = (x: number) => x + 1;

    const inc = new Impl(
      'function inc(uint256 x) external returns (uint256)',
      ([x]) => [inc0(x.toNumber())],
      ([x], res) => {
        expect(res.length).to.equal(1);
        expect(res[0].toNumber()).to.equal(inc0(x));
      },
      unexpected
    );
    const dup = new Impl(
      'function dup(uint256 x) external returns (uint256, uint256)',
      ([x]) => [x, x],
      ([x], res) => {
        expect(res.length).to.equal(2);
        expect(res[0].toNumber()).to.equal(x);
        expect(res[1].toNumber()).to.equal(x);
      },
      unexpected
    );
    const bad = new Impl(
      'function bad() external returns (uint256)',
      () => { throw new Error('failed'); },
      unexpected,
      (_, data) => console.log(data.slice(0, 10), defaultAbiCoder.decode(['string'], '0x' + data.slice(10)))
    );

    async function multicall(handlers: Impl[], calls: [Impl, any[]][]) {
      const iface = new Interface([
        'function multicall(bytes[] calldata data) external returns (bytes[] memory results)'
      ]);
      const frag = iface.getFunction('multicall');
      const server = new Server();
      for (let impl of handlers) {
        server.add(impl.iface, [{
          type: impl.frag.format(),
          func: (args) => impl.f(args as any[])
        }]);
      }
      const app = server.makeApp('/rpc/');
      const res = await supertest(app)
        .post('/rpc/')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .send({
          'sender': TEST_ADDRESS,
          'data': iface.encodeFunctionData(frag, [calls.map(([impl, args]) => impl.iface.encodeFunctionData(impl.frag, args))])
        })
        .expect(200)
        .expect('Content-Type', /json/);
      const result = iface.decodeFunctionResult(frag, res.body.data);
      expect(result.length).to.equal(1);
      expect(result[0].length).to.equal(calls.length);
      calls.forEach(([impl, args], i) => {
        const data = result[0][i];
        if ((data.length - 2) & 63) { // remove 0x, not 32-byte padded
          impl.err(args, data);
        } else {
          impl.ok(args, impl.iface.decodeFunctionResult(impl.frag, data));
        }
      });
    }

    it('(0) calls: []',                                () => multicall([], []));
    it('(2) calls: [inc(), dup()]',                    () => multicall([inc, dup], [[inc, [1]], [dup, [2]]]));
    it('repeated calls: [inc(), inc(), inc()]',        () => multicall([inc],      [[inc, [1]], [inc, [2]], [inc, [3]]]));
    it('missing impl: [inc(), bad()] => [OK, Error]',  () => multicall([inc],      [[inc, [1]], [bad, []]]));
    it('throwing impl: [bad(), inc()] => [Error, OK]', () => multicall([inc, bad], [[bad, []],  [inc, [1]]]));

  });
});
