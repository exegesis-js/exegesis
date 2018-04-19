import http from 'http';

// Stolen from @types/connect.
export type NextFunction = (err?: any) => void;
export type NextHandleFunction = (req: http.IncomingMessage, res: http.ServerResponse, next: NextFunction) => void;

export interface BodyParser {
    /**
     * Synchronous function which parses a string.  A BodyParser must implement
     * this function to be used for parameter parsing.
     *
     * @param encoded - The encoded value to parse.
     * @returns - The decoded value.
     */
    parseString?(encoded: string) : any;

    // /**
    //  * Async function which parses a stream.
    //  *
    //  * @param stream - The stream to read.
    //  * @param contentType - The content-type we are trying to parse.
    //  * @param options.encoding - The encoding for the stream.
    //  * @returns - A Promise which resolves to the decoded value.
    //  */
    // parseStreamAsync?(
    //     stream: Readable,
    //     contentType: string,
    //     options?: {encoding?: string}
    // ) : PromiseLike<any>;

    // /**
    //  * Async function which parses a stream.
    //  *
    //  * @param stream - The stream to read.
    //  * @param contentType - The content-type we are trying to parse.
    //  * @param options.encoding - The encoding for the stream.
    //  * @param callback - Callback to call when complete.
    //  */
    // parseStream?(
    //     stream: Readable,
    //     contentType: string,
    //     options: {encoding?: string},
    //     done: Callback<any>
    // ) : void;

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
    parseReq : NextHandleFunction;

    // /**
    //  * Async function which parses an incoming HTTP request.  This is essentially
    //  * here so you can use express/connect body parsers.
    //  *
    //  * @param req - The request to read.
    //  * @param res - The response object.  Well behaved body parsers should *not*
    //  *   write anything to the response or modify it in any way.
    //  * @param [next] - An optional callback to call when complete.
    //  * @returns - A Promise which resolves to the decoded value.  If `next`
    //  *   is provided, returns null.
    //  */
    // parseReqAsync?(req: http.IncomingMessage, res: any) : PromiseLike<any>;

}

export interface ParameterBodyParser extends BodyParser {
    /**
     * Synchronous function which parses a string.  A BodyParser must implement
     * this function to be used for parameter parsing.
     *
     * @param encoded - The encoded value to parse.
     * @returns - The decoded value.
     */
    parseString(encoded: string) : any;
}

export function isParameterBodyParser(parser: BodyParser) : parser is ParameterBodyParser {
    return !!parser.parseString;
}
