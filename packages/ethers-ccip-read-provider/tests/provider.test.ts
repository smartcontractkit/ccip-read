import { Server } from '@chainlink/ccip-read-server';
import { CCIPReadProvider, CCIPReadSigner } from '../src';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ethers } from 'ethers';
import ganache from 'ganache-cli';
import testUtils from '../artifacts/TestUtils.sol/TestUtils.json';
import token from '../artifacts/Token.sol/Token.json';
import { arrayify } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/solidity';
import { JsonRpcSigner, Web3Provider } from '@ethersproject/providers';
import { FetchJsonResponse } from '@ethersproject/web';

chai.use(chaiAsPromised);

const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ACCOUNT = '0x000000000000000000000000000000000000dead';
const TEST_URL = 'http://localhost:8000/rpc/{sender}/{data}.json';
const TEST_POST_URL = 'http://localhost:8000/rpc/';

function deploySolidity(data: any, signer: ethers.Signer, ...args: any[]) {
  const factory = ethers.ContractFactory.fromSolidity(data, signer);
  return factory.deploy(...args);
}

/**
 * Hack to ensure that revert data gets passed back from test nodes the same way as from real nodes.
 * This middleware catches Ganache's custom revert error and returns it as response data instead.
 */
class RevertNormalisingMiddleware extends ethers.providers.BaseProvider {
  readonly parent: ethers.providers.BaseProvider;

  constructor(provider: ethers.providers.BaseProvider) {
    super(provider.getNetwork());
    this.parent = provider;
  }

  getSigner(addressOrIndex?: string | number): JsonRpcSigner {
    return (this.parent as Web3Provider).getSigner(addressOrIndex);
  }

  async perform(method: string, params: any): Promise<any> {
    switch (method) {
      case 'call':
        try {
          return await this.parent.perform(method, params);
        } catch (e) {
          const err = e as any;
          if (err.hashes !== undefined && err.hashes.length > 0) {
            return err.results[err.hashes[0]].return;
          }
          throw e;
        }
      default:
        const result = await this.parent.perform(method, params);
        return result;
    }
  }

  detectNetwork(): Promise<ethers.providers.Network> {
    return this.parent.detectNetwork();
  }
}

describe('ethers-ccip-read-provider', () => {
  const baseProvider = new ethers.providers.Web3Provider(ganache.provider());
  const messageSigner = new ethers.Wallet(TEST_PRIVATE_KEY);
  let ccipProvider: CCIPReadProvider;
  let utilsContract: ethers.Contract;
  let contract: ethers.Contract;
  let account: string;
  let snapshot: number;

  const server = new Server();
  server.add(
    ['function getSignedBalance(address addr) view returns(uint256 balance, bytes memory sig)'],
    [
      {
        type: 'getSignedBalance',
        func: async (args) => {
          const [addr] = args;
          const balance = ethers.BigNumber.from('1000000000000000000000');
          let messageHash = keccak256(['uint256', 'address'], [balance, addr]);
          let messageHashBinary = arrayify(messageHash);
          const signature = await messageSigner.signMessage(messageHashBinary);
          return [balance, signature];
        },
      },
    ]
  );

  function fetcher(url: string, json?: string, _processFunc?: (value: any, response: FetchJsonResponse) => any) {
    if(json === undefined) {
      const [_match, to, data] = url.match(/http:\/\/localhost:8000\/rpc\/([^/]+)\/([^/]+).json/) as RegExpMatchArray;
      return server.call({ to, data });
    } else {
      expect(url).to.equal(TEST_POST_URL);
      const {sender, data} = JSON.parse(json);
      return server.call({ to: sender, data});
    }
  }

  beforeAll(async () => {
    const signer = await baseProvider.getSigner();
    account = await signer.getAddress();

    const proxyMiddleware = new RevertNormalisingMiddleware(baseProvider);
    ccipProvider = new CCIPReadProvider(proxyMiddleware, fetcher);

    utilsContract = (await deploySolidity(testUtils, signer)).connect(ccipProvider);

    const c = await deploySolidity(token, signer, 'Test', 'TST', 0);
    await c.setSigner(await messageSigner.getAddress());
    await c.setUrls([TEST_URL]);
    contract = c.connect(ccipProvider);

    snapshot = await baseProvider.send('evm_snapshot', []);
  });

  afterEach(async () => {
    await baseProvider.send('evm_revert', [snapshot]);
  });

  describe('CCIPReadProvider', () => {
    it('passes calls through to the underlying provider', async () => {
      const network = await baseProvider.getNetwork();
      expect((await ccipProvider.getNetwork()).chainId).to.equal(network.chainId);
    });

    it('handles an OffchainLookup', async () => {
      expect((await contract.connect(ccipProvider).balanceOf(account)).toString()).to.equal('1000000000000000000000');
    });

    it('handles an OffchainLookup via POST', async () => {
      await contract.connect(await baseProvider.getSigner()).setUrls([TEST_POST_URL]);
      expect((await contract.connect(ccipProvider).balanceOf(account)).toString()).to.equal('1000000000000000000000');
    });

    it('throws an error if the OffchainLookup is thrown in a nested scope', async () => {
      await expect(utilsContract.balanceOf(contract.address, account)).to.be.rejectedWith(
        'OffchainLookup thrown in nested scope'
      );
    });
  });

  describe('CCIPReadSigner', () => {
    let signer: CCIPReadSigner;

    beforeAll(async () => {
      signer = await ccipProvider.getSigner();
    });

    it('sends regular transactions', async () => {
      await contract.connect(signer).setUrls([TEST_URL]);
      expect(await contract.urls(0)).to.equal(TEST_URL);
    });

    it('translates CCIP read transactions', async () => {
      expect((await contract.connect(signer).balanceOf(account)).toString()).to.equal('1000000000000000000000');
      const tx = await contract.connect(signer).transfer(TEST_ACCOUNT, '1000000000000000000');
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
      expect((await contract.balanceOf(account)).toString()).to.equal('999000000000000000000');
      expect((await contract.balanceOf(TEST_ACCOUNT)).toString()).to.equal('1001000000000000000000');
    });
  });
});
