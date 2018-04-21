import ld from 'lodash';
import { JsonPath } from '../types';

export function jsonPointerUriFragmentToJsonPointer(ref: string) : string {
    if(ref.startsWith('/')) {
        return ref;
    } else if(ref.startsWith('#/')) {
        return decodeURIComponent(ref.slice(1));
    } else {
        throw new Error(`Invalid JSON Pointer: ${ref}`);
    }
}

export function jsonPointerToJsonPointerUriFragment(ref: string) : string {
    if(ref.startsWith('#/')) {
        return ref;
    } else if(ref.startsWith('/')) {
        return "#/" + ref.slice(1)
            .split('/')
            .map(encodeURIComponent)
            .join('/');
    } else {
        throw new Error(`Invalid JSON Pointer: ${ref}`);
    }
}

/**
 * Given a JSON path, returns a JSON pointer URI fragment.
 * @param path - The path to encode (e.g. ['foo', 'bar']).
 * @returns - A JSON pointer (e.g. '/foo/bar').
 */
export function pathToJsonPointer(path: JsonPath) : string {
    return '/' + path
        .map(str => str.replace(/~/g, '~0').replace(/\//g, '~1'))
        .join('/');
}

/**
 * Given a JSON pointer URI fragment, returns a JSON path.
 * @param ref - The pointer (e.g. '/foo/bar' or '#/foo/bar').
 * @returns - A path (e.g. ['foo', 'bar']).
 */
export function jsonPointerToPath(ref: string) : JsonPath {
    ref = jsonPointerUriFragmentToJsonPointer(ref).slice(1);
    if(ref === '') {
        return [];
    } else {
        return ref.split('/')
            .map(str => str.replace(/~1/g, '/').replace(/~0/g, '~'));
    }
}

export function startsWith(path: JsonPath, prefix: JsonPath) : boolean {
    return ld.isEqual(prefix, path.slice(0, prefix.length));
}

export function jsonPointerStartsWith(path: string, prefix: string) : boolean {
    path = jsonPointerUriFragmentToJsonPointer(path);
    prefix = jsonPointerUriFragmentToJsonPointer(prefix);
    return path.startsWith(prefix);
}

export function jsonPointerStripPrefix(path: string, prefix: string) : string {
    path = jsonPointerUriFragmentToJsonPointer(path);
    prefix = jsonPointerUriFragmentToJsonPointer(prefix);
    if(path.startsWith(prefix)) {
        return '#' + path.slice(prefix.length);
    } else {
        return path;
    }
}