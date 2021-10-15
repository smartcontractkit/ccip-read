# Durin server

 Implements a Durin gateway service using express.js.
 
## How to install

```
yarn add @ensdomains/durin
```

## Example usage:

 ```javascript
 const durin = require('durin');
 const server = new durin.Server();
 const abi = [
   'function balanceOf(address addr) public returns(uint256)',
   'function balanceOfWithProof(address addr, uint256 balance, bytes proof) public returns(uint256)',
 ];
 server.add(abi, [
   {
     calltype: 'balanceOf',
     returntype: 'balanceOfWithProof',
     func: async (contractAddress, [addr]) => {
       const balance = getBalance(addr);
       const sig = signMessage([addr, balance]);
       return [addr, balance, sig];
     }
   }
 ], '0x...');
 const app = server.makeApp();
 app.listen(8080);
 ```
 
 Notice `.add()` specifies the function being implemented (`balanceOf`) and the verification
 function it returns encoded calldata for (`balanceOfWithProof`), and the handler function
 returns arguments matching the input arguments of `balanceOfWithProof`.