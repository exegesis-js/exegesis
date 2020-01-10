import { Readable } from 'stream';

export default function stringToStream(str: string, encoding: string = 'utf-8') {
    return new Readable({
        read() {
            this.push(str, encoding);
            this.push(null);
        },
    });
}
