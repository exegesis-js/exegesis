import http from 'http';
import { Callback } from './basicTypes';

// Stolen from @types/connect.
export type NextHandleFunction = (req: http.IncomingMessage, res: http.ServerResponse, next: Callback<void>) => void;

export type StringParserFunction = (encoded: string) => any;
export type ReqParserFunction = NextHandleFunction;

export interface StringParser {
    /**
     * Synchronous function which parses a string.  A BodyParser must implement
     * this function to be used for parameter parsing.
     *
     * @param encoded - The encoded value to parse.
     * @returns - The decoded value.
     */
    parseString: StringParserFunction;
}

export interface BodyParser {
    /**
     * Async function which parses an incoming HTTP request.  This is essentially
     * here so you can use express/connect body parsers.
     *
     * @param req - The request to read.  This function should add `req.body`
     *   after parsing the body.  If `req.body` is already present, this
     *   function can ignore the body and just call `next()`.
     * @param res - The response object.  Well behaved body parsers should *not*
     *   write anything to the response or modify it in any way.
     * @param done - Callback to call when complete.  If no value is returned
     *   via the callback then `req.body` will be used.
     */
    parseReq: ReqParserFunction;
}

export interface MimeTypeParser extends StringParser, BodyParser {}