import { Readable } from 'stream';
import * as exegesis from '../../../../src';

export function replyWithStream(context: exegesis.ExegesisContext) {
    context.res.setHeader('content-type', 'application/json');

    const body = new Readable({
        read() {
            this.push('{"message": "This was streamed"}');
            this.push(null);
        },
    });

    return body;
}
