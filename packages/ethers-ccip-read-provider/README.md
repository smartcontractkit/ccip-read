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
