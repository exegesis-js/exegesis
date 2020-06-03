import http from 'http';
import contentType from 'content-type';
import getRawBody from 'raw-body';

import { httpHasBody } from '../utils/httpUtils';
import { MimeTypeParser, StringParser, HttpIncomingMessage, Callback } from '../types';

export default class BodyParserWrapper implements MimeTypeParser {
    private _parser: StringParser;
    private _maxBodySize: number;

    constructor(parser: StringParser, maxBodySize: number) {
        this._parser = parser;
        this._maxBodySize = maxBodySize;
    }

    parseString(value: string) {
        return this._parser.parseString(value);
    }

    parseReq(req: HttpIncomingMessage, _res: http.ServerResponse, done: Callback<any>): void {
        if (req.body) {
            // Already parsed;
            return done();
        }

        // Make sure we have a body to parse
        if (!httpHasBody(req.headers)) {
            return done();
        }

        // Work out the encoding
        let encoding = 'utf-8';
        const parsedContentType = contentType.parse(req);
        if (parsedContentType && parsedContentType.parameters) {
            encoding = (parsedContentType.parameters.encoding || encoding).toLowerCase();
        }

        // Read the body
        getRawBody(req, { limit: this._maxBodySize, encoding }, (err, str) => {
            if (err) {
                return done(err);
            }

            req.body = this._parser.parseString(str);
            done(null, req.body);
        });
    }
}
