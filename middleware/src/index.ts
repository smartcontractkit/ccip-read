
export interface DurinProvider {
    request: (request: { method: string, params: Array<any> }) => Promise<any>;
}

interface EthersProvider {
    send:(method:string, params: Array<any>) => Promise<any>
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
        console.log('***request4', {params})
        const response = await this.provider.request({method: "eth_call", params: params});
        console.log(response);
        return response;
    }
}
