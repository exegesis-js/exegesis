import * as jsonPtr from 'json-ptr';

function normalize(path: string) : string {
    return jsonPtr.encodePointer(jsonPtr.decode(path));
}

export function jsonPointerStartsWith(path: string, prefix: string) : boolean {
    path = normalize(path);
    prefix = normalize(prefix);
    return path.startsWith(prefix);
}

export function jsonPointerStripPrefix(path: string, prefix: string) : string {
    path = normalize(path);
    prefix = normalize(prefix);
    if(path.startsWith(prefix)) {
        return path.slice(prefix.length);
    } else {
        return path;
    }
}