import ld from 'lodash';
import {JsonPath} from '../types/common';

function jsonPointerToJsonPointerUriFragment(ref: string) : string {
    if(ref.startsWith('#/')) {
        return ref;
    } else if(ref.startsWith('/')) {
        return '#' + decodeURIComponent(ref);
    } else {
        throw new Error(`Invalid JSON Pointer: ${ref}`);
    }
}

/**
 * Given a JSON path, returns a JSON pointer URI fragment.
 * @param path - The path to encode (e.g. ['foo', 'bar']).
 * @returns - A JSON pointer (e.g. '#/foo/bar').
 */
export function pathToJsonPointer(path: JsonPath) : string {
    return '#/' + path
        .map(str => str.replace(/~/g, '~0').replace(/\//g, '~1'))
        .map(encodeURIComponent).join('/');
}

/**
 * Given a JSON pointer URI fragment, returns a JSON path.
 * @param ref - The pointer (e.g. '#/foo/bar').
 * @returns - A path (e.g. ['foo', 'bar']).
 */
export function jsonPointerToPath(ref: string) : JsonPath {
    if(ref.startsWith('#/')) {
        ref = ref.slice(2);
        if(ref === '') {
            return [];
        } else {
            return ref.split('/')
              .map(str => str.replace(/~1/g, '/').replace(/~0/g, '~'))
                .map(decodeURIComponent);
        }
    } else if(ref.startsWith('/')) {
        ref = ref.slice(1);
        if(ref === '') {
            return [];
        } else {
            return ref.split('/')
              .map(str => str.replace(/~1/g, '/').replace(/~0/g, '~'));
        }
    } else {
        throw new Error(`Invalid JSON pointer: ${ref}`);
    }
}

export function startsWith(path: JsonPath, prefix: JsonPath) : boolean {
    return ld.isEqual(prefix, path.slice(0, prefix.length));
}

export function jsonPointerStartsWith(path: string, prefix: string) : boolean {
    path = jsonPointerToJsonPointerUriFragment(path);
    prefix = jsonPointerToJsonPointerUriFragment(prefix);
    return path.startsWith(prefix);
}

export function jsonPointerStripPrefix(path: string, prefix: string) : string {
    path = jsonPointerToJsonPointerUriFragment(path);
    prefix = jsonPointerToJsonPointerUriFragment(prefix);
    if(path.startsWith(prefix)) {
        return '#' + path.slice(prefix.length);
    } else {
        return path;
    }
}