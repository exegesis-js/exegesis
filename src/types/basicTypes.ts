import * as http from 'http';
import {Context as KoaContext} from 'koa';

export type Callback<T> = (err?: Error | null | undefined, value?: T) => void;

export type MiddlewareFunction = (
  ctx: KoaContext,
  next?: Callback<void>
) => Promise<void>;

export interface Dictionary<T> {
  [key: string]: T;
}

/**
 * A dictionary of parameters, where keys are the source of the parameters.
 */
export interface ParametersByLocation<T> {
  /** Parameters that came from the HTTP query string. */
  query: T;

  /** Parameters that came from an HTTP header. */
  header: T;

  /** Parameters that were parsed from the "server" in the OAS3 document. */
  server: T;

  /** Parameters that were parsed from the "path. */
  path: T;

  /** Parameters that came from cookies. */
  cookie: T;
}

/**
 * A collection of parameters.
 */
export interface ParametersMap<T> {
  [key: string]: T;
}

export interface HttpIncomingMessage extends http.IncomingMessage {
  body?: any;
}
