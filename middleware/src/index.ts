const ethers = require('ethers');
const nodeFetch = require('node-fetch');
const abi = ['error OffchainLookup(bytes,bytes,string)']
const iface = new ethers.utils.Interface(abi)

export interface DurinProvider {
    request: (request: { method: string, params: Array<any> }) => Promise<any>;
}

interface EthersProvider {
    send:(method:string, params: Array<any>) => Promise<any>
}

// interface OffchainLookupError {
//     errorName: string;
// }

type Handler = (params?: Array<any>) => Promise<any>;

class EthersProviderWrapper {
    readonly provider:EthersProvider;
    constructor(provider:EthersProvider ){
        this.provider = provider
    }
    request(request: { method: string, params: Array<any> }){
        return this.provider.send(request.method, request.params)
    }
}

function isEthersProvider(provider: EthersProvider | DurinProvider): provider is EthersProvider  {
    return (provider as EthersProvider).send !== undefined
}

// function isOffchainLookupError(x: any): x is OffchainLookupError {
//     return x.errorName === 'OffchainLookup';
// }

export class DurinMiddleware implements DurinProvider {
    readonly provider: DurinProvider;
    
    constructor(provider: EthersProvider | DurinProvider) {
        if (isEthersProvider(provider) ) {
            this.provider = new EthersProviderWrapper(provider)
        } else {
            this.provider = provider
        }
    }

    request(request: { method: string, params: Array<any> }): Promise<any> {
        console.log('***request1', {request})
        const handler = this['handle_' + request.method as keyof DurinMiddleware] as Handler;
        console.log('***request2', this.provider)
        if(handler !== undefined) {
            return handler.bind(this)(request.params);
        }
        console.log('***request3', this.provider)
        return this.provider.request(request);
    }

    async handle_eth_call(params: Array<any>): Promise<any> {
        const response = await this.provider.request({method: "eth_call", params: params});
        const error = iface.decodeErrorResult('OffchainLookup', response)
        let url
        if(error){
            url = error[2]
            handleOffchainLookup(url, params)
        }
        console.log('***request4.5',{response});
        return response;
    }

    async handleOffchainLookup(url:string, params: Array<any>): Promise<any>{
      const body = {
        jsonrpc: '2.0',
        method: 'durin_call',
        params,
        id: 1,
      };
      const result = await (
        await nodeFetch(url, {
          method: 'post',
          body: JSON.stringify(body),
          headers: { 'Content-Type': 'application/json' },
        })
      ).json();
      console.log({result})
    //   try{
    //     const outputdata = await provider.call({
    //       to: RESOLVER_STUB_ADDRESS,
    //       data: result && result.result,
    //     });
    //     return iface.decodeFunctionResult('addrWithProof', outputdata);  
    //   }catch(ee){
    //     console.log(`*** resolver.addrWithProof error: ${ee.message}`);
    //   }
    }
}
