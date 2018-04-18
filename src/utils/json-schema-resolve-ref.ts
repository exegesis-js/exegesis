import * as jsonPaths from './jsonPaths';

function resolveRefPriv(document: any, ref: string) : any {
    if(!ref.startsWith('#/') && !ref.startsWith('/')) {
        throw new Error(`Cannot resolve non-local ref ${ref}`);
    }

    const path = jsonPaths.jsonPointerToPath(ref);
    let currentDoc = document;
    while(path.length > 0) {
        const pathname = path.shift() as string;
        currentDoc = currentDoc && currentDoc[pathname];
        while(currentDoc && currentDoc.$ref) {
            currentDoc = resolveRefPriv(document, currentDoc.$ref);
        }
    }

    return currentDoc;
}

export function resolveRef(document: any, ref: string | any) : any | undefined {
    if(ref instanceof String) {
        return resolveRef(document, ref.toString());
    } else if(typeof ref === 'string') {
        return resolveRefPriv(document, ref);
    } else if(ref.$ref) {
        return resolveRefPriv(document, ref.$ref);
    } else {
        return ref;
    }
}
