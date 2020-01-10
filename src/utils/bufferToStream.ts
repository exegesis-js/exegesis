import { Readable } from 'stream';

export default function bufferToStream(buf: Buffer) {
    return new Readable({
        read() {
            this.push(buf);
            this.push(null);
        },
    });
}
