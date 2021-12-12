import cors from 'cors';
import { ethers, BytesLike } from 'ethers';
import { Fragment, FunctionFragment, Interface, JsonFragment } from '@ethersproject/abi';
import { hexlify } from '@ethersproject/bytes';
import express from 'express';

interface RPCCall {
  id: string;
  data: {
    to: BytesLike;
    data: BytesLike;
  };
}

interface RPCResponseBase {
  jobRunID: string;
  statusCode: number;
}

interface RPCSuccessResponse extends RPCResponseBase {
  statusCode: 200;
  data: {
    result: BytesLike;
  };
}

interface RPCClientErrorResponse extends RPCResponseBase {
  statusCode: 400 | 404;
  error: {
    name: string;
    message: string;
  };
}

interface RPCServerErrorResponse extends RPCResponseBase {
  statusCode: 400;
  error: {
    name: string;
    message: string;
  };
}

type RPCResponse = RPCSuccessResponse | RPCClientErrorResponse | RPCServerErrorResponse;

export type HandlerFunc = (args: ethers.utils.Result, req?: RPCCall) => Promise<Array<any>> | Array<any>;

interface Handler {
  type: FunctionFragment;
  func: HandlerFunc;
}

function toInterface(abi: string | readonly (string | Fragment | JsonFragment)[] | Interface) {
  if (Interface.isInterface(abi)) {
    return abi;
  }
  return new Interface(abi);
}

function isRPCCall(x: any): x is RPCCall {
  return x.id !== undefined && x.data !== undefined && x.data.to !== undefined && x.data.data !== undefined;
}

export interface HandlerDescription {
  type: string;
  func: HandlerFunc;
}

/**
 * Implements a Durin gateway service using express.js.
 *
 * Example usage:
 * ```javascript
 * const ccipread = require('ccip-read');
 * const server = new ccipread.Server();
 * const abi = [
 *   'function getSignedBalance(address addr) public view returns(uint256 balance, bytes memory sig)',
 * ];
 * server.add(abi, [
 *   {
 *     type: 'getSignedBalance',
 *     func: async (contractAddress, [addr]) => {
 *       const balance = getBalance(addr);
 *       const sig = signMessage([addr, balance]);
 *       return [balance, sig];
 *     }
 *   }
 * ]);
 * const app = server.makeApp();
 * app.listen(8080);
 * ```
 */
export class Server {
  /** @ignore */
  readonly handlers: { [selector: string]: Handler };

  /**
   * Constructs a new Durin gateway server instance.
   */
  constructor() {
    this.handlers = {};
  }

  /**
   * Adds an interface to the gateway server, with handlers to handle some or all of its functions.
   * @param abi The contract ABI to use. This can be in any format that ethers.js recognises, including
   *        a 'Human Readable ABI', a JSON-format ABI, or an Ethers `Interface` object.
   * @param handlers An array of handlers to register against this interface.
   */
  add(abi: string | readonly (string | Fragment | JsonFragment)[] | Interface, handlers: Array<HandlerDescription>) {
    const abiInterface = toInterface(abi);

    for (const handler of handlers) {
      const fn = abiInterface.getFunction(handler.type);

      this.handlers[Interface.getSighash(fn)] = {
        type: fn,
        func: handler.func,
      };
    }
  }

  /**
   * Convenience function to construct an `express` application object for the gateway.
   * Example usage:
   * ```javascript
   * const ccipread = require('ccip-read');
   * const server = new ccipread.Server();
   * // set up server object here
   * const app = server.makeApp();
   * app.serve(8080);
   * ```
   * @returns An `express.Application` object configured to serve as a Durin gateway.
   */
  makeApp(path: string): express.Application {
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.post(path, this.handleRequest.bind(this));
    return app;
  }

  async handleRequest(req: express.Request, res: express.Response) {
    if (!isRPCCall(req.body)) {
      res.json({
        jobRunID: req.body.id || '1',
        statusCode: 400,
        error: {
          name: 'InvalidRequest',
          message: 'Invalid request format',
        },
      });
      return;
    }

    try {
      res.json(await this.call(req.body));
    } catch (e: any) {
      res.json({
        jobRunID: req.body.id,
        statusCode: 500,
        error: {
          name: 'InternalError',
          message: `Internal server error: ${e.toString()}`,
        },
      });
    }
  }

  async call(req: RPCCall): Promise<RPCResponse> {
    // Get the function selector
    const data = ethers.utils.hexlify(req.data.data);
    const selector = data.slice(0, 10).toLowerCase();

    // Find a function handler for this selector
    const handler = this.handlers[selector];
    if (handler === undefined) {
      return {
        jobRunID: req.id,
        statusCode: 404,
        error: {
          name: 'FunctionNotFound',
          message: `No implementation for function with selector ${selector}`,
        },
      };
    }

    // Decode function arguments
    const args = ethers.utils.defaultAbiCoder.decode(handler.type.inputs, '0x' + data.slice(10));

    // Call the handler
    const result = await handler.func(args, req);

    // Encode return data
    return {
      jobRunID: req.id,
      statusCode: 200,
      data: {
        result: handler.type.outputs
          ? hexlify(ethers.utils.defaultAbiCoder.encode(handler.type.outputs, result))
          : '0x',
      },
    };
  }
}
