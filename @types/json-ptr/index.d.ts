declare module 'json-ptr' {
    export function encodePointer(path: string[]) : string;
    export function decode(pointer: string) : string[];
}