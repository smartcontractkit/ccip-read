import cors from 'cors';
import { ethers } from 'ethers';
import { Fragment, FunctionFragment, Interface, JsonFragment } from '@ethersproject/abi';
import { concat, hexlify } from '@ethersproject/bytes';
import express from 'express';
import jayson from 'jayson/promise';

export type HandlerFunc = (address: string, args: ethers.utils.Result) => Promise<Array<any>> | Array<any>;

interface Handler {
  calltype: FunctionFragment;
  returntype: FunctionFragment;
  func: HandlerFunc;
}

interface CallArgs {
  to: string,
  data: string
}

function typematch(a: ethers.utils.ParamType[] | undefined, b: ethers.utils.ParamType[] | undefined): boolean {
  if (a === undefined && b === undefined) {
    return true;
  }
  if (a === undefined || b === undefined) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value.type === b[index].type);
}

function toInterface(abi: string | readonly (string | Fragment | JsonFragment)[] | Interface) {
  if (Interface.isInterface(abi)) {
    return abi;
  }
  return new Interface(abi);
}

export interface HandlerDescription {
  calltype: string;
  returntype: string;
  func: HandlerFunc;
}

/**
 * Implements a Durin gateway service using express.js.
 *
 * Example usage:
 * ```javascript
 * const durin = require('durin');
 * const server = new durin.Server();
 * const abi = [
 *   'function balanceOf(address addr) public returns(uint256)',
 *   'function balanceOfWithProof(address addr, uint256 balance, bytes proof) public returns(uint256)',
 * ];
 * server.add(abi, [
 *   {
 *     calltype: 'balanceOf',
 *     returntype: 'balanceOfWithProof',
 *     func: async (contractAddress, [addr]) => {
 *       const balance = getBalance(addr);
 *       const sig = signMessage([addr, balance]);
 *       return [addr, balance, sig];
 *     }
 *   }
 * ], '0x...);
 * const app = server.makeApp();
 * app.listen(8080);
 * ```
 *
 * Notice `.add()` specifies the function being implemented (`balanceOf`) and the verification
 * function it returns encoded calldata for (`balanceOfWithProof`), and the handler function
 * returns arguments matching the input arguments of `balanceOfWithProof`.
 */
export class Server {
  /** @ignore */
  readonly handlers: { [address: string]: { [selector: string]: Handler } };
  /** A `jayson.Server` object that implements the required Durin endpoints */
  readonly server: jayson.Server;

  /**
   * Constructs a new Durin gateway server instance.
   */
  constructor() {
    this.handlers = {};
    this.server = new jayson.Server({
      durin_call: this.call.bind(this),
    });
  }

  /**
   * Adds an interface to the gateway server, with handlers to handle some or all of its functions.
   * @param abi The contract ABI to use. This can be in any format that ethers.js recognises, including
   *        a 'Human Readable ABI', a JSON-format ABI, or an Ethers `Interface` object.
   * @param handlers An object describing the handlers to register against this interface.
   * @param address The address of the contract. If omitted, the handler will be called for matching
   *        function calls on any address.
   * @returns An [[InterfaceBuilder]] object that can be used to register handler functions for this interface.
   */
  add(
    abi: string | readonly (string | Fragment | JsonFragment)[] | Interface,
    handlers: Array<HandlerDescription>,
    address?: string
  ) {
    const abiInterface = toInterface(abi);

    if (this.handlers[address || ''] !== undefined) {
      throw new Error(`Interface for address ${address} already defined`);
    }
    const handlersForAddress: { [key: string]: Handler } = (this.handlers[address || ''] = {});

    for (const handler of handlers) {
      const callfunc = abiInterface.getFunction(handler.calltype);
      const returnfunc = abiInterface.getFunction(handler.returntype);
      if (!typematch(callfunc.outputs, returnfunc.outputs)) {
        throw new Error(`Return types of ${handler.calltype} and ${handler.returntype} do not match`);
      }

      handlersForAddress[Interface.getSighash(callfunc)] = {
        calltype: callfunc,
        returntype: returnfunc,
        func: handler.func,
      };
    }
  }

  /**
   * Convenience function to construct an `express` application object for the gateway.
   * Example usage:
   * ```javascript
   * const durin = require('durin');
   * const server = new durin.Server();
   * // set up server object here
   * const app = server.makeApp();
   * app.serve(8080);
   * ```
   * @returns An `express.Application` object configured to serve as a Durin gateway.
   */
  makeApp(): express.Application {
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(this.server.middleware());
    return app;
  }

  async call({ to, data }:CallArgs): Promise<any> {
    // Get the function selector
    const selector = data.slice(0, 10).toLowerCase();

    // Find a function handler for this selector
    const handlersForAddress = this.handlers[to] || this.handlers[''];
    const handler = handlersForAddress?.[selector];
    if (handler === undefined) {
      throw new Error('No matching function handler');
    }

    // Decode function arguments
    const args = ethers.utils.defaultAbiCoder.decode(handler.calltype.inputs, '0x' + data.slice(10));

    // Call the handler
    const result = await handler.func(to, args);

    // Encode return data
    return hexlify(
      concat([
        Interface.getSighash(handler.returntype),
        ethers.utils.defaultAbiCoder.encode(handler.returntype.inputs, result),
      ])
    );
  }
}
