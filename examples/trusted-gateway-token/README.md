
## Truested gateway ERC20 token example

## Summary

This example showcase a simple token airdrop usecase using [Trusted gateway](https://speakerdeck.com/makoto_inoue/ens-on-layer2-at-ethcc-2021?slide=29) model where gateway sign the data with a signer and L2 verify the data based on who signed the data, rather than the verifying the data itself.

![](./diagram.png)

## The flow

### Showing the token balance

- an ERC20 token on L1 has `signer` field and the token owner can set an Ethereum address. 
- The gateway server has a flat file containg the list of ethereum address and how much token to airdrop
- When a client calls `token.balanceOf(address)` on L1, it throws `OffchainLookup` error with the gateway server url.
- When the client calls the token gateway server, it checks the file to see if the `address` qualifies for the airdrop and how much, sign the message of `balance` and `address` with the private key of the `signer`, and returns with the signature
- The client then calls `token.balanceOfWithProof()` with the proof.
- The L1 token verifies that the message was signed by `token.signer` and returns the balance

### Claiming the token and transfer to someone else.

Becuase `Token.balanceOf` shows the balance of the both L1 and off chain information. You don't need to claim just to find out how much you own. You can claim only when you want to transfer the token to some on L1.

- When the client calls `token.transfer(recipient, amount)` on L1, it throws `OffchainLookup` error with the gateway server url.
- When the client calls the token gateway server, it checks the file to see if the `from` address qualifies for the airdrop and how much, sign the message of `balance` and `address` with the private key of the `signer`, and returns with the signature
- The client then calls `token.transferOfWithProof(recipient, amount)` with the proof.
- The L1 token verifies that the message was signed by `token.signer`, `mint` new token for the `balance` , then transfer the `amount` to the `recipient`

## How to set up

### 1. clone the repo

```
git clone https://github.com/ensdomains/durin
cd examples/trusted-gateway-token
```

### 2. Start up local Ethereum node

```
cd contracts
cd yarn
npx hardhat node
```

### 3. Create a file with address and balance

Use `addresses[2]` of the ethereum address from the local ethereum node

```
$more server/data/nodes.csv 
address, balance
0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,10
```

### 4. copy .env.local to .env and edit the following fields

Take one of the ethereum address from the local ethereum node

- PROVIDER_URL=http://localhost:8545
- SIGNER_PRIVATE_KEY= Use `addresses[0]` of the ethereum address from the local ethereum node
- SENDER_PRIVATE_KEY= Use `addresses[1]` of the ethereum address from the local ethereum node
- ADDRESS_FILE_PATH= Locate the relative path of the file from `server` path. For example, if you locate the file to `$DURIN_PROJECT_PATH/examples/trusted-gateway-token/server/data/nodes.csv`, then add `./data/nodes.csv`

### 5. Deploy the contract

```
$yarn deploy
yarn run v1.22.10
$ npx hardhat run --network localhost scripts/deploy.js
Token deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
The signer is set to: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Saving as TOKEN_ADDRESS to: ../.env
✨  Done in 1.90s.
```

This will add `TOKEN_ADDRESS` to the .env file

### 6. Run the server

```
cd $DURIN_PROJECT_PATH/server
yarn
yarn start
```

### 7. Run the client

```
cd $DURIN_PROJECT_PATH/client
yarn
yarn start
```

If successful, it should show the following messages demonstrating that SENDER had 10 token to claim and transferred 1 of the tokens to RECIPIENT

```
SENDER    0x3C... balance 10
RECIPIENT 0x86... balance 0
TRANSFER  1 from 0x3C... to 0x86..
SENDER    0x3C... balance 9
RECIPIENT 0x86... balance 1
```