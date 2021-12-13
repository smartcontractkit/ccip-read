import { Server } from '@smartcontractkit/ccip-read-server';
import { CCIPReadProvider } from '../src';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ethers } from 'ethers';
import ganache from 'ganache-cli';
import proxy from 'testcontract/artifacts/contracts/RevertProxy.sol/RevertProxy.json';
import token from 'testcontract/artifacts/contracts/Token.sol/Token.json';
import { arrayify } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/solidity';

chai.use(chaiAsPromised);

const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

function deploySolidity(data: any, signer: ethers.Signer, ...args: any[]) {
    const factory = ethers.ContractFactory.fromSolidity(data, signer);
    return factory.deploy(...args);
}

/**
 * Hack to ensure that revert data gets passed back from test nodes the same way as from real nodes.
 * This middleware wraps all eth_call operations in calls to a stub contract that catches reverts and
 * returns them as regular data.
 */
class CallProxyMiddleware extends ethers.providers.BaseProvider {
    readonly parent: ethers.providers.BaseProvider;
    readonly proxy: ethers.Contract;

    constructor(provider: ethers.providers.BaseProvider, proxy: ethers.Contract) {
        super(provider.getNetwork());
        this.parent = provider;
        this.proxy = proxy;
    }

    async perform(method: string, params: any): Promise<any> {
        switch(method) {
        case "call":
            return await this.proxy.callStatic.call(params.transaction.to, params.transaction.data);
        default:
            const result = await this.parent.perform(method, params);
            return result;
        }
    }

    detectNetwork(): Promise<ethers.providers.Network> {
        return this.parent.detectNetwork();
    }
}

describe('CCIPReadProvider', () => {
    const baseProvider = new ethers.providers.Web3Provider(ganache.provider());
    const messageSigner = new ethers.Wallet(TEST_PRIVATE_KEY);
    let ccipProvider: ethers.providers.BaseProvider;
    let proxyContract: ethers.Contract;
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
                    const balance = ethers.BigNumber.from("1000000000000000000000");
                    let messageHash = keccak256(
                      ['uint256', 'address'],
                      [balance, addr]
                    );
                    let messageHashBinary = arrayify(messageHash);
                    const signature = await messageSigner.signMessage(messageHashBinary);
                    return [balance, signature];            
                } 
            }
        ]
    );

    function fetcher(_url: string, json?: string) {
        const data = JSON.parse(json as string);
        return server.call(data);
    }

    beforeAll(async () => {
        const signer = await baseProvider.getSigner();
        account = await signer.getAddress();

        proxyContract = await deploySolidity(proxy, signer);
        const proxyMiddleware = new CallProxyMiddleware(baseProvider, proxyContract);
        ccipProvider = new CCIPReadProvider(proxyMiddleware, fetcher);

        contract = await deploySolidity(token, signer, "Test", "TST", 0);
        await contract.setSigner(await messageSigner.getAddress());
        await contract.setUrl("http://localhost:8000/");

        snapshot = await baseProvider.send('evm_snapshot', []);
    });

    afterEach(async () => {
        await baseProvider.send('evm_revert', [snapshot]);
    })

    it('passes calls through to the underlying provider', async () => {
        const network = await baseProvider.getNetwork();
        expect((await ccipProvider.getNetwork()).chainId).to.equal(network.chainId);
    });

    it('handles an OffchainLookup', async () => {
        expect((await contract.connect(ccipProvider).balanceOf(account)).toString())
            .to.equal("1000000000000000000000");
    });

    it('throws an error if the OffchainLookup is thrown in a nested scope', async () => {
        const c = proxyContract.connect(ccipProvider);
        await expect(c.balanceOf(contract.address, account)).to.be.rejectedWith('OffchainLookup thrown in nested scope');
    });
});
