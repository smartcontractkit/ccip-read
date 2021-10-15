# Durin Middleware

Durin Middleware wraps [EIP1193 compatible provider](https://eips.ethereum.org/EIPS/eip-1193) and adds support to call Durin middleware

## How to install

```
npm install @ensdomains/durin-middleware
```

## How to use

```js
const middleware = require('@ensdomains/durin-middleware')
const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
const durinProvider = new middleware.DurinMiddleware(provider)
const wrappedProvider = new ethers.providers.Web3Provider(durinProvider)
const resolver = new ethers.Contract(RESOLVER_STUB_ADDRESS, abi, wrappedProvider);
resolver.addr(node);
```

For the full example, refer to `examples/optimism-gateway/client/src/index.ts`

## Underthehood.

Durin Middleware implements [Provider.request(args: RequestArguments): Promise<unknown>;](https://eips.ethereum.org/EIPS/eip-1193#request-1) function.

If the request returns `OffchainLookup` returns, then the middleware does the following

- Extract `prefix` and `url` from the error arguments
- Calls `url` which often calls l2 on behalf the user and returns `*withProof` function name with data and proof
- Extract the result of the call to `url` and calls the function (eg: `addrWithProof`)

## TODO

- Add Test

