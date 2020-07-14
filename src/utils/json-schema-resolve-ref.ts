import * as jsonPtr from 'json-ptr';

function resolveRefPriv(document: any, ref: string): any {
    if (!ref.startsWith('#/') && !ref.startsWith('/') && ref !== '') {
        throw new Error(`Cannot resolve non-local ref ${ref}`);
    }

    const path = jsonPtr.JsonPointer.decode(ref).slice();
    let currentDoc = document;
    while (path.length > 0) {
        const pathname = path.shift() as string;
        currentDoc = currentDoc && currentDoc[pathname];
        while (currentDoc && currentDoc.$ref) {
            currentDoc = resolveRefPriv(document, currentDoc.$ref);
        }
    }

    return currentDoc;
}

export function resolveRef(document: any, ref: string | any): any | undefined {
    if (ref instanceof String) {
        return resolveRef(document, ref.toString());
    } else if (typeof ref === 'string') {
        return resolveRefPriv(document, ref);
    } else if (ref.$ref) {
        return resolveRefPriv(document, ref.$ref);
    } else {
        return ref;
    }
}
