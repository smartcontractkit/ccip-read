# CCIP Read

[![CI](https://github.com/weiroll/weiroll.js/actions/workflows/main.yml/badge.svg)](https://github.com/weiroll/weiroll.js/actions/workflows/main.yml)[![size](https://github.com/weiroll/weiroll.js/actions/workflows/size.yml/badge.svg)](https://github.com/weiroll/weiroll.js/actions/workflows/size.yml)[![Docs](https://github.com/weiroll/weiroll.js/actions/workflows/docs.yml/badge.svg)](https://weiroll.github.io/weiroll.js/)

CCIP Read is a protocol and framework that allows contracts to request external data as part of a call or transaction.

The CCIP read specification is [EIP 3668](https://eips.ethereum.org/EIPS/eip-3668).

This repository contains several major components:
 - [The CCIP-read server framework](packages/server/) for authoring CCIP read gateways.
 - [The CCIP-read Cloudflare Worker framework](packages/worker/) for authoring CCIP read gateways.
 - [An Ethers Provider middleware](packages/ethers-ccip-read-provider/) which permits adding CCIP read support to clients with a single line of code.
 - [Example applications](packages/examples/).
