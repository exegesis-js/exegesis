import { Readable } from 'stream';

export function isReadable(obj: any): obj is Readable {
    return obj && obj.pipe && typeof obj.pipe === 'function';
}
