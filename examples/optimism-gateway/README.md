
## Optimism gateway ENS resolver example

## Summary

This example is a port of https://github.com/ensdomains/l2gateway-demo

## The flow

## How to set up

### 1. Setup optimism environment

Follow [the Optimism guide to create a node locally](https://community.optimism.io/docs/developers/l2/dev-node.html#creating-a-node)

This will start up l2 on port 8545 and l1 on port 9545.
All the subsequent accounts are generated from the following seed

```
test test test test test test test test test test test junk
```

### 2. clone the repo

```
git clone https://github.com/ensdomains/durin
cd examples/optimism-gateway
```

### 3. Deploy Resolver contracts

```
cd contracts
cd yarn
yarn deploy
```

This will deploy `OptimismResolver` into l2 and `OptimismResolverStub` to l1

```
~/.../optimism-gateway/contracts (optimism)$yarn deploy
yarn run v1.22.10
$ yarn deploy:l2 && yarn deploy:l1
$ IS_OPTIMISM=true npx hardhat --network optimistic run scripts/l2deploy.js
OptimismResolver deployed to 0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
Address set
$ npx hardhat --network integration run scripts/deploy.js
{ RESOLVER_ADDRESS: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6' }
ENS registry deployed at 0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575
OptimismResolverStub deployed at 0x7969c5eD335650692Bc04293B07F5BF2e7A673C0
```

### 4. Start gateway server


```
cd ../server
yarn
yarn start
```

### 4. Run client script

```
cd ../client
yarn
yarn start
```

If successful, it should show the following messages demonstrating that SENDER had 10 token to claim and transferred 1 of the tokens to RECIPIENT

```
$yarn start
yarn run v1.22.10
$ yarn build && node dist/index.js
$ tsdx build
@rollup/plugin-replace: 'preventAssignment' currently defaults to false. It is recommended to set this option to `true`, as the next major version will default this option to `true`.
@rollup/plugin-replace: 'preventAssignment' currently defaults to false. It is recommended to set this option to `true`, as the next major version will default this option to `true`.
✓ Creating entry file 1.2 secs
✓ Building modules 3.4 secs
{ RESOLVER_STUB_ADDRESS: '0x5302E909d1e93e30F05B5D6Eea766363D14F9892' }
Ask durin
*** resolver.addr error: missing revert data in call exception (error={"reason":"processing response error","code":"SERVER_ERROR","body":"{\"jsonrpc\":\"2.0\",\"id\":44,\"error\":{\"code\":-32603,\"message\":\"Error: Transaction reverted without a reason string\"}}","error":{"code":-32603},"requestBody":"{\"method\":\"eth_call\",\"params\":[{\"to\":\"0x5302e909d1e93e30f05b5d6eea766363d14f9892\",\"data\":\"0x3b3b57de28f4f6752878f66fd9e3626dc2a299ee01cfe269be16e267e71046f1022271cb\"},\"latest\"],\"id\":44,\"jsonrpc\":\"2.0\"}","requestMethod":"POST","url":"http://localhost:9545"}, data="0x", code=CALL_EXCEPTION, version=providers/5.4.5)
[ '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' ]
Setting to zero address to l2
Set new value to l2 0x0000000000000000000000000000000000000001
Wait 10 sec
Ask durin again
*** resolver.addr error: missing revert data in call exception (error={"reason":"processing response error","code":"SERVER_ERROR","body":"{\"jsonrpc\":\"2.0\",\"id\":48,\"error\":{\"code\":-32603,\"message\":\"Error: Transaction reverted without a reason string\"}}","error":{"code":-32603},"requestBody":"{\"method\":\"eth_call\",\"params\":[{\"to\":\"0x5302e909d1e93e30f05b5d6eea766363d14f9892\",\"data\":\"0x3b3b57de28f4f6752878f66fd9e3626dc2a299ee01cfe269be16e267e71046f1022271cb\"},\"latest\"],\"id\":48,\"jsonrpc\":\"2.0\"}","requestMethod":"POST","url":"http://localhost:9545"}, data="0x", code=CALL_EXCEPTION, version=providers/5.4.5)
[ '0x0000000000000000000000000000000000000001' ]
✨  Done in 17.85s.
```