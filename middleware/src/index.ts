import { ethers } from 'ethers';
export interface DurinProvider {
    request?: (request: { method: string, params?: Array<any> | undefined }) => Promise<any>| undefined;
    send?: (request: { method: string, params?: Array<any> | undefined }) => Promise<any>| undefined;
    // send: (method: string, params: Array<any>) => Promise<any> | undefined;
    isProvider?: (provider?:any) => boolean;
}

type Handler = (params?: Array<any>) => Promise<any>;

export class DurinMiddleware implements DurinProvider {
    readonly provider: DurinProvider;
    
    constructor(provider: DurinProvider) {
        console.log('***constructor', provider)
        // if (provider.isProvider && provider.isProvider(provider)) {
            //detect ethersProvider
            this.provider = provider
        // } else {
        //     this.provider = new ethers.providers.Web3Provider(provider)
        // }
    }

    // Alias
    // send(method: string, params: Array<any>): Promise<any>| undefined {
    //     // return this.request({method, params});
    //     throw(1);
    // }

    request(request: { method: string, params?: Array<any>| undefined; }): Promise<any> | undefined {
        console.log('***request1', {request})
        const handler = this['handle_' + request.method as keyof DurinMiddleware] as Handler;
        console.log('***request2', this.provider)
        if(handler !== undefined) {
            return handler(request.params);
        }
        console.log('***request3', this.provider)
        if(this.provider.send){
            return this.provider.send(request);
        }
    }

    // async call(params?: Array<any>): Promise<any> {
    //     console.log('***handle_call', {params})
    //     const response = await this.provider.request({method: "call", params: params});
    //     console.log(response);
    //     return response;
    // }

    // async handle_call(params?: Array<any>): Promise<any> {
    //     console.log('***handle_call', {params})
    //     const response = await this.provider.request({method: "call", params: params});
    //     console.log(response);
    //     return response;
    // }
}
