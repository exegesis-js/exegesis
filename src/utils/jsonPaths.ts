import * as jsonPtr from 'json-ptr';

function normalize(path: string): string {
    return jsonPtr.encodePointer(jsonPtr.JsonPointer.decode(path));
}

export function toUriFragment(path: string) {
    return jsonPtr.encodeUriFragmentIdentifier(jsonPtr.JsonPointer.decode(path));
}

export function jsonPointerStartsWith(path: string, prefix: string): boolean {
    path = normalize(path);
    prefix = normalize(prefix);
    return path.startsWith(prefix);
}

export function jsonPointerStripPrefix(path: string, prefix: string): string {
    const isUriFragment = path.startsWith('#');
    path = normalize(path);
    prefix = normalize(prefix);
    if (path.startsWith(prefix)) {
        const answer = path.slice(prefix.length);
        if (isUriFragment) {
            return toUriFragment(answer);
        } else {
            return answer;
        }
    } else {
        return path;
    }
}
