import { Route } from 'itty-router';

type MethodType = 'GET' | 'POST';

export interface IRequest extends Request {
  params: any;
  method: MethodType;
  url: string;
  optional?: string;
}

export interface IMethods {
  get: Route;
  post: Route;
}

/*
  @ref: https://github.com/kwhitley/itty-router-extras/discussions/16#discussioncomment-1470308
*/
export const handleCors =
  (options: any = {}) =>
  (request: IRequest) => {
    const {
      origin = '*',
      methods = 'GET, POST, PATCH, DELETE',
      headers = 'referer, origin, content-type',
      maxAge = null,
      allowCredentials = false,
    } = options;
    if (request.headers.get('Origin') !== null && request.headers.get('Access-Control-Request-Method') !== null) {
      const corsHeaders: any = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': methods,
        'Access-Control-Allow-Headers': headers,
      };

      if (allowCredentials) {
        corsHeaders['Access-Control-Allow-Credentials'] = 'true';
      }

      if (maxAge) {
        corsHeaders['Access-Control-Max-Age'] = maxAge;
      }

      // Handle CORS pre-flight request.
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Handle standard OPTIONS request.
    return new Response(null, {
      headers: {
        Allow: `${methods}, HEAD, OPTIONS`,
      },
    });
  };

export const wrapCorsHeader = (response: Response, options: any = {}) => {
  const { origin = '*' } = options;

  response.headers.set('Access-Control-Allow-Origin', origin);

  return response;
};
