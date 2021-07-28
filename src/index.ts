import cors from 'cors';
import { ethers } from 'ethers';
import { Fragment, FunctionFragment, Interface, JsonFragment } from '@ethersproject/abi';
import { concat, hexlify } from '@ethersproject/bytes';
import express from 'express';
import jayson from 'jayson/promise';

type HandlerFunc = (address: string, args: ethers.utils.Result) => Promise<Array<any>>;

interface Handler {
  calltype: FunctionFragment;
  returntype: FunctionFragment;
  func: HandlerFunc;
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
  return a.every((value, index) => value === b[index]);
}

/**
 * Builder class for constructing interface definitions handled by the Durin gateway.
 */
export class InterfaceBuilder {
  /** @ignore */
  readonly abi: Interface;
  /** @ignore */
  readonly handlers: { [selector: string]: Handler };

  /** @ignore */
  constructor(abi: Interface, handlers: { [selector: string]: Handler }) {
    this.abi = abi;
    this.handlers = handlers;
  }

  /**
   * Add a function handler for this interface.
   *
   * Durin function handlers provide a mechanism for fetching data from offchain sources
   * and verifying it using a contract. Function handlers must take input arguments matching
   * those of the contract function they replicate, and return arguments for the matching
   * verification function on the same contract.
   *
   * @param calltype The function name or signature of the function call to handle.
   * @param returntype The function name or signature for the handler's return data.
   * @param func The handler function, which must accept arguments matching the input
   *        parameters for `calltype` and return an array matching the input parameters
   *        for `returntype`.
   */
  add(calltype: string, returntype: string, func: HandlerFunc) {
    const callfunc = this.abi.getFunction(calltype);
    const returnfunc = this.abi.getFunction(returntype);
    if (!typematch(callfunc.outputs, returnfunc.outputs)) {
      throw new Error(`Return types of ${calltype} and ${returntype} do not match`);
    }

    this.handlers[this.abi.getSighash(calltype)] = {
      calltype: callfunc,
      returntype: returnfunc,
      func: func,
    };
  }
}

/**
 * Implements a Durin gateway service using express.js.
 *
 * Example usage:
 * ```javascript
 * const durin = require('durin');
 * const server = new durin.Server();
 * const abi = `
 *   function balanceOf(address addr) public returns(uint256);
 *   function balanceOfWithProof(address addr, uint256 balance, bytes proof) public returns(uint256);
 * `;
 * const iface = server.addInterface(abi, "0x...");
 * iface.add('balanceOf', 'balanceOfWithProof', async (contractAddress, [addr]) => {
 *   const balance = getBalance(addr);
 *   const sig = signMessage([addr, balance]);
 *   return [addr, balance, sig];
 * });
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
      durin_call: this.durin_call,
    });
  }

  /**
   * Returns an [[InterfaceBuilder]] that can be used to register handler functions for the provided
   * ABI and address.
   * @param abi The contract ABI to use. This can be in any format that ethers.js recognises, including
   *        a 'Human Readable ABI', a JSON-format ABI, or an Ethers `Interface` object.
   * @param address The address of the contract. If omitted, the handler will be called for matching
   *        function calls on any address.
   * @returns An [[InterfaceBuilder]] object that can be used to register handler functions for this interface.
   */
  addInterface(
    abi: string | readonly (string | Fragment | JsonFragment)[] | Interface,
    address?: string
  ): InterfaceBuilder {
    let abiInterface: Interface;
    if (Interface.isInterface(abi)) {
      abiInterface = abi;
    } else {
      abiInterface = new Interface(abi);
    }

    if (this.handlers[address || ''] !== undefined) {
      throw new Error(`Interface for address ${address} already defined`);
    }
    const handlersForAddress = (this.handlers[address || ''] = {});
    return new InterfaceBuilder(abiInterface, handlersForAddress);
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

  private async durin_call({ to, data }: { to: string; data: string; abi: JsonFragment }): Promise<any> {
    // Get the function selector
    const selector = data.slice(0, 10).toLowerCase();

    // Find a function handler for this selector
    const handlersForAddress = this.handlers[to] || this.handlers[''];
    const handler = handlersForAddress?.[selector];
    if (handler === undefined) {
      throw this.server.error(404, 'No matching function handler');
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
