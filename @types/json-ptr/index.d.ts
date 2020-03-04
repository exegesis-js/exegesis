declare module 'json-ptr' {
    export function encodePointer(path: string[]): string;
    export function decode(pointer: string): string[];
    export function encodeUriFragmentIdentifier(path: string[]): string;
}
