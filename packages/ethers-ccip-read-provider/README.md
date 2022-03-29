# [DEPRECATION WARNING]

Please use ethers.js 5.6.2 or newer that includes both CCIP read and wildcard support.
Plrease read [the doc](https://docs.ens.domains/dapp-developer-guide/ens-l2-offchain) for more detail.

# Ethers CCIP-read provider
This package implements an Ethers provider that wraps any other Ethers provider, adding transparent support for EIP 3668 (CCIP read).

With this provider installed, calls to contracts that implement EIP 3668 look like regular contract calls, with fetching of external data and reissuing the call happening transparently behind the scenes.

Example usage:
```javascript
// outerProvider is whatever your usual Ethers provider would be
const outerProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545/');
const provider = new CCIPReadProvider(outerProvier);
const contract = new ethers.Contract(address, abi, provider);
const result = await contract.someFunc(...);
```
