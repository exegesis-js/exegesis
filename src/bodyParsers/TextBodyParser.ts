import http from 'http';
import expressBodyParser from 'body-parser';

import { MimeTypeParser, ReqParserFunction, Callback } from '../types';

export default class TextBodyParser implements MimeTypeParser {
    private _bodyParserMiddlware: ReqParserFunction;

    constructor(maxBodySize: number) {
        // FIXME: https://github.com/expressjs/body-parser/issues/304
        this._bodyParserMiddlware = expressBodyParser.text({
            inflate: true,
            limit: maxBodySize,
            type: '*/*',
        }) as ReqParserFunction;
    }

    parseString(value: string) {
        return value;
    }

    parseReq(req: http.IncomingMessage, res: http.ServerResponse, done: Callback<void>): void {
        this._bodyParserMiddlware(req, res, done);
    }
}
