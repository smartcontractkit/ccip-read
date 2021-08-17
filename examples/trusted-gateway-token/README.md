
## ERC20 token example


## How to set up

### 1. clone the repo

```
git clone ....
cd .../examples/...
```

### 2. Start up local Ethereum node


### 3. Create a file with address and balance

Example

```
$more server/data/nodes.csv 
address, balance
0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,10
```

### 4. copy .env.local to .env and edit the following fields

- PROVIDER_URL=http://localhost:8545
- SIGNER_PRIVATE_KEY=
- SENDER_PRIVATE_KEY=
- ADDRESS_FILE_PATH=

### 5. Deploy the contract
### 6. Run the server
### 7. Run the client

```
yarn start
```

If successful, it should show the following messages

```
SENDER 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC balance 10
RECIPIENT 0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199 balance 0
TRANSFER 1 from 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC to 0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199
SENDER 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC balance 9
RECIPIENT 0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199 balance 1
```