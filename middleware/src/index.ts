// import { fetchJson } from "@ethersproject/web";

export interface Web3Provider {
    request: (request: { method: string, params?: Array<any> }) => Promise<any>;
}

type Handler = (params?: Array<any>) => Promise<any>;

export class DurinMiddleware implements Web3Provider {
    readonly provider: Web3Provider;

    constructor(provider: Web3Provider) {
        this.provider = provider;
    }

    request(request: { method: string, params?: Array<any> }): Promise<any> {
        const handler = this['handle_' + request.method as keyof DurinMiddleware] as Handler;
        if(handler !== undefined) {
            return handler(request.params);
        }
        return this.provider.request(request);
    }

    async handle_call(params?: Array<any>): Promise<any> {
        const response = await this.provider.request({method: "call", params: params});
        console.log(response);
        return response;
    }
}
