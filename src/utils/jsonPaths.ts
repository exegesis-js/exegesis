import ld from 'lodash';
import {JsonPath} from '../types/common';

export function pathToJsonRef(path: JsonPath) : string {
    return '#/' + path.map(encodeURIComponent).join('/');
}

// Converts a jsonRef to a path.  Only works with refs that start with "#/".
export function jsonRefToPath(ref: string) : JsonPath {
    if(ref.startsWith('#/')) {
        ref = ref.slice(2);
    } else if(ref.startsWith('/')) {
        ref = ref.slice(1);
    } else {
        throw new Error(`Invalid JSON ref: ${ref}`);
    }

    if(ref === '') {
        return [];
    } else {
        return ref.split('/').map(decodeURIComponent);
    }
}

export function startsWith(path: JsonPath, prefix: JsonPath) : boolean {
    return ld.isEqual(prefix, path.slice(0, prefix.length));
}

export function jsonPathStartsWith(path: string, prefix: string) : boolean {
    if(path.startsWith('#')) {path = path.slice(1);}
    if(prefix.startsWith('#')) {prefix = prefix.slice(1);}
    return path.startsWith(prefix);
}

export function jsonPathStripPrefix(path: string, prefix: string) : string {
    if(path.startsWith('#')) {path = path.slice(1);}
    if(prefix.startsWith('#')) {prefix = prefix.slice(1);}
    if(path.startsWith(prefix)) {
        return path.slice(prefix.length);
    } else {
        return path;
    }
}