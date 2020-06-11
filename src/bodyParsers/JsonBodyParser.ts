import http from 'http';
import expressBodyParser from 'body-parser';

import { MimeTypeParser, ReqParserFunction, Callback } from '../types';

export default class JsonBodyParser implements MimeTypeParser {
    private _bodyParserMiddlware: ReqParserFunction;

    constructor(maxBodySize: number) {
        // FIXME: https://github.com/expressjs/body-parser/issues/304
        this._bodyParserMiddlware = expressBodyParser.json({
            inflate: true,
            limit: maxBodySize,
            type: '*/*',
        }) as ReqParserFunction;
    }

    parseString(value: string) {
        return JSON.parse(value);
    }

    parseReq(req: http.IncomingMessage, res: http.ServerResponse, done: Callback<void>): void {
        this._bodyParserMiddlware(req, res, done);
    }
}
