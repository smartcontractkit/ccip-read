const ethers = require('ethers');
const nodeFetch = require('node-fetch');
const abi = ['error OffchainLookup(bytes,bytes,string)']
const iface = new ethers.utils.Interface(abi)

export interface DurinProvider {
    request: (request: { method: string, params: Array<any> }) => Promise<any>;
}

interface EthersProvider {
    send:(method:string, params: Array<any>) => Promise<any>;
}

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
        const handler = this['handle_' + request.method as keyof DurinMiddleware] as Handler;
        if(handler !== undefined) {
            return handler.bind(this)(request.params);
        }
        return this.provider.request(request);
    }

    async handle_eth_call(params: Array<any>): Promise<any> {
        const response = await this.provider.request({method: "eth_call", params: params});
        const error = iface.decodeErrorResult('OffchainLookup', response)
        let url
        if(error){
            url = error[2]
            return this.handleOffchainLookup(url, params)
        }else{
            return response;
        }
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
      const newParams = [{
        to: params && params[0].to,
        data: result && result.result
      }]
      try{
        const outputdata = await this.provider.request({
            method: "eth_call",
            params: newParams
        });
        return outputdata
      }catch(error){
        console.log({error});
      }
    }
}
