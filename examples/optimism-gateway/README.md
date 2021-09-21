
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
✓ Creating entry file 1.6 secs
✓ Building modules 3.8 secs
{ RESOLVER_STUB_ADDRESS: '0x01c1DeF3b91672704716159C9041Aeca392DdFfb' }
Ask durin
*** resolver.addr error: missing revert data in call exception (error={"reason":"processing response error","code":"SERVER_ERROR","body":"{\"jsonrpc\":\"2.0\",\"id\":44,\"error\":{\"code\":-32603,\"message\":\"Error: Transaction reverted without a reason string\"}}","error":{"code":-32603},"requestBody":"{\"method\":\"eth_call\",\"params\":[{\"to\":\"0x01c1def3b91672704716159c9041aeca392ddffb\",\"data\":\"0x3b3b57de28f4f6752878f66fd9e3626dc2a299ee01cfe269be16e267e71046f1022271cb\"},\"latest\"],\"id\":44,\"jsonrpc\":\"2.0\"}","requestMethod":"POST","url":"http://localhost:9545"}, data="0x", code=CALL_EXCEPTION, version=providers/5.4.5)
[ '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' ]
Setting to zero address to l2
Set to l2 0x0000000000000000000000000000000000000000
Wait 10 sec
Ask durin again
*** resolver.addr error: missing revert data in call exception (error={"reason":"processing response error","code":"SERVER_ERROR","body":"{\"jsonrpc\":\"2.0\",\"id\":48,\"error\":{\"code\":-32603,\"message\":\"Error: Transaction reverted without a reason string\"}}","error":{"code":-32603},"requestBody":"{\"method\":\"eth_call\",\"params\":[{\"to\":\"0x01c1def3b91672704716159c9041aeca392ddffb\",\"data\":\"0x3b3b57de28f4f6752878f66fd9e3626dc2a299ee01cfe269be16e267e71046f1022271cb\"},\"latest\"],\"id\":48,\"jsonrpc\":\"2.0\"}","requestMethod":"POST","url":"http://localhost:9545"}, data="0x", code=CALL_EXCEPTION, version=providers/5.4.5)
*** resolver.addrWithProof error: missing revert data in call exception (error={"reason":"processing response error","code":"SERVER_ERROR","body":"{\"jsonrpc\":\"2.0\",\"id\":50,\"error\":{\"code\":-32603,\"message\":\"Error: VM Exception while processing transaction: reverted with reason string 'Storage value does not exist'\"}}","error":{"code":-32603},"requestBody":"{\"method\":\"eth_call\",\"params\":[{\"to\":\"0x01c1def3b91672704716159c9041aeca392ddffb\",\"data\":\"0xd1aab3f428f4f6752878f66fd9e3626dc2a299ee01cfe269be16e267e71046f1022271cb00000000000000000000000000000000000000000000000000000000000000404d1e230e78103e94f89a6bc80249e2ae41f9709c77a3453389c721e92e221cd300000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000580000000000000000000000000000000000000000000000000000000000000002d4d1e230e78103e94f89a6bc80249e2ae41f9709c77a3453389c721e92e221cd30000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000005500000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000614a08a000000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000350f9034db90214f90211a0ae3009af7d2d03aec322c73d33c3bf6da188c65529d311413ce19c6bfd6145e9a0ab8cdb808c8303bb61fb48e276217be9770fa83ecf3f90f2234d558885f5abf1a0336c742aa847780e5ace8a588b83e88ba3156664196e05c90c3de64e9362aa02a0fc0f110880e638037f35d1afc838af9b047d005d2204ab1a4012a47154510033a0c441b2850308ef18cba55206b2d775dbdc0dca3901af395e325d3f5b30b7fccea01f05c019730d0fc7d766c199a54604a3d2f02842d01fd11b1ed8ebaf43c98c7ea096f78d1f0e643e5eb62343bef981faa648a3c7f5c13b510a744ff2eed22db11fa065e890621ac053c077264ded06d715fd042026b6abfd1a0bd39c307987760287a06f11dedd5c60d9cbb77d851e653a8c77e538cdadc6744be06a246cb33bd25174a071a33cbc57ebc8fb9cb3bb1451f178193450cef15995f779eb607070c3018ca5a033d817ddb640d4886ecd2220850ec977cddb21de6b75fcb4fdd20e320ac6857da000e26e6689d35a36a3c3f2e5adcbb2851870012f508ae7ef013a8b660498ebf2a023ade52db74e32cba225b4f795912ce95bdb890832339a3a0558a021e87d1faca0c5ebd815a071733f10cd87765691fcc697080503a9ea04149de38d5f46327e75a0ac9ebe6378dfc3d73f67b5944dae2a653eaface2ecdff3f464e3ff6382eb7adaa0c0f0cabbd2b805fdf50a65518aecb86d1975e792a02537a9ee76e344e9bc31ea80b873f871808080808080a05c7c2864fa6e5c3c3b180cef57bd9474153f3456c250f12295ea24abaf43a52280808080a027610754ecefaf6c5b3b55a4ee16335189026f9c82100de3a8e7b025de43eb15a0c6f169496584dea79509b36dc1a20e7cd40c47d158c91f47c258934262336d4280808080b853f85180808080808080a0217c80e930622cbc974097c908fde369ca22ba9d72ca7568f45d867291448ef08080a03cd8fc90ce3edafb70233d68cf5cfb9e83361d08d7b0817ab45ded0d7b1424eb808080808080b86af8689f3ec1bf180df753c5d531859c8989474a8a27072190b8738c6b04ec7b90e8a3b846f8440180a007b0f866c231f8f9a48f53b74cc80ddaa975fa0067f422e859caeedc9344a0b0a04e68c142d9868bdac09dc340f66f4bb7dae2f680a53970c62be43a700911f85f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003ef83cb83af838a120290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e5639594f39fd6e51aad88f6f4ce6ab8827279cfffb922660000\"},\"latest\"],\"id\":50,\"jsonrpc\":\"2.0\"}","requestMethod":"POST","url":"http://localhost:9545"}, data="0x", code=CALL_EXCEPTION, version=providers/5.4.5)
✨  Done in 18.70s.
```