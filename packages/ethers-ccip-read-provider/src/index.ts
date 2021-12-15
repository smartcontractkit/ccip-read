import { defaultAbiCoder, Interface } from '@ethersproject/abi';
import { Signer } from '@ethersproject/abstract-signer';
import { arrayify, Bytes, BytesLike, hexConcat, hexlify } from '@ethersproject/bytes';
import { Logger } from '@ethersproject/logger';
import { Deferrable, resolveProperties } from '@ethersproject/properties';
import { BaseProvider, BlockTag, Network, Provider, TransactionRequest, TransactionResponse } from '@ethersproject/providers';
import { fetchJson } from '@ethersproject/web';

const logger = new Logger('0.1.0');

const CCIP_READ_INTERFACE = new Interface([
    "error OffchainLookup(address sender, string url, bytes callData, bytes4 callbackFunction, bytes extraData)",
    "function callback(bytes memory result, bytes memory extraData)"
]);

export type Fetch = (url: string, json?: string) => Promise<any>;

interface HasSigner {
    getSigner(addressOrIndex?: string | number): Signer;
}

function hasSigner(obj: any): obj is HasSigner {
    return (obj as unknown as HasSigner).getSigner !== undefined;
}

async function handleCall(provider: CCIPReadProvider, params: {transaction: TransactionRequest, blockTag?: BlockTag}): Promise<{transaction: TransactionRequest, result: BytesLike}> {
    const result = await provider.parent.perform('call', params);
    const bytes = arrayify(result);
    
    if(bytes.length % 32 !== 4 || hexlify(bytes.slice(0, 4)) !== CCIP_READ_INTERFACE.getSighash("OffchainLookup")) {
        return {transaction: params.transaction, result: bytes};
    }

    const {sender, url, callData, callbackFunction, extraData} = CCIP_READ_INTERFACE.decodeErrorResult("OffchainLookup", bytes);
    if(params.transaction.to === undefined || sender.toLowerCase() !== params.transaction.to.toLowerCase()) {
        return logger.throwError("OffchainLookup thrown in nested scope", Logger.errors.UNSUPPORTED_OPERATION, {
            to: params.transaction.to,
            sender,
            url,
            callData,
            callbackFunction,
            extraData
        });
    }
    const response = await sendRPC(provider.fetcher, url, params.transaction.to, callData);
    const data = hexConcat([callbackFunction, defaultAbiCoder.encode(CCIP_READ_INTERFACE.getFunction('callback').inputs, [response, extraData])]);
    const request = Object.assign({}, params, {
        transaction: Object.assign({}, params.transaction, {data}),
    });
    return handleCall(provider, request);
}

async function sendRPC(fetcher: Fetch, url: string, to: BytesLike, callData: BytesLike): Promise<BytesLike> {
    const data = await fetcher(url, JSON.stringify({
        id: "1",
        data: {
            to: hexlify(to),
            data: hexlify(callData),
        }
    }));
    if(data.statusCode < 200 || data.statusCode > 299) {
        return logger.throwError("bad response", Logger.errors.SERVER_ERROR, {
            status: data.statusCode,
            name: data.error.name,
            message: data.error.message,
        })
    }
    return data.data.result;
}

/**
 * Ethers provider middleware that implements the offchain call pattern from EIP 3668.
 * Simply wrap your regular Ethers provider in this and CCIP-read operations will be
 * handled transparently.
 * 
 * Example usage:
 * ```javascript
 * const outerProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');
 * const provider = new CCIPReadProvider(outerProvier);
 * const contract = new ethers.Contract(address, abi, provider);
 * const result = await contract.someFunc(...);
 * ```
 */
export class CCIPReadProvider extends BaseProvider {
    readonly parent: BaseProvider;
    readonly fetcher: Fetch;

    /**
     * Constructor.
     * @param provider: The Ethers provider to wrap.
     */
    constructor(provider: BaseProvider, fetcher: Fetch = fetchJson) {
        super(provider.getNetwork());
        this.parent = provider;
        this.fetcher = fetcher;
    }

    getSigner(addressOrIndex?: string | number): CCIPReadSigner {
        if(!hasSigner(this.parent)) {
            return logger.throwError("CCIPReadProvider only supports getSigner if the wrapped provider does", Logger.errors.NOT_IMPLEMENTED, {parent: this.parent});
        }
        return new CCIPReadSigner(_constructorGuard, this.parent.getSigner(addressOrIndex), this);
    } 

    async perform(method: string, params: any): Promise<any> {
        switch(method) {
            case 'call':
                const {result} = await handleCall(this, params);
                return result;
            default:
                return this.parent.perform(method, params);
        }
    }

    detectNetwork(): Promise<Network> {
        return this.parent.detectNetwork();
    }
}

const _constructorGuard = {};

export class CCIPReadSigner extends Signer {
    readonly parent: Signer;
    readonly provider: CCIPReadProvider;

    constructor(constructorGuard: any, parent: Signer, provider: CCIPReadProvider) {
        super();

        if(constructorGuard !== _constructorGuard) {
            throw new Error("do not call the CCIPReadSigner directly; use provider.getSigner");
        }

        this.parent = parent;
        this.provider = provider;
    }

    getAddress(): Promise<string> {
        return this.parent.getAddress();
    }

    signMessage(message: string | Bytes): Promise<string> {
        return this.parent.signMessage(message);
    }

    signTransaction(_transaction: Deferrable<TransactionRequest>): Promise<string> {
        return logger.throwError("CCIPReadSigner does not support signTransaction", Logger.errors.NOT_IMPLEMENTED);
    }

    connect(_provider: Provider): Signer {
        return logger.throwError("CCIPReadSigner does not support connect", Logger.errors.NOT_IMPLEMENTED);
    }

    async sendTransaction(request: Deferrable<TransactionRequest>): Promise<TransactionResponse> {
        let transaction = await resolveProperties(request);

        // gasLimit, if set, applies to the final transaction; unset it for the preflight
        const gasLimit = transaction.gasLimit;
        delete transaction.gasLimit;

        ({transaction} = await handleCall(this.provider, {transaction, blockTag: 'latest'}));

        // Restore the original gasLimit, if any
        transaction.gasLimit = gasLimit;

        return this.parent.sendTransaction(transaction);
    }
}
