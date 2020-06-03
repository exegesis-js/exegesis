export function httpHasBody(headers: { [header: string]: any }): boolean {
    const contentLength = headers['content-length'];
    return (
        !!headers['transfer-encoding'] ||
        (contentLength && contentLength !== '0' && contentLength !== 0)
    );
}

// `delete` might have a body. See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/DELETE
const HTTP_METHODS_WITHOUT_BODY = ['get', 'head', 'trace', 'options'];

export function requestMayHaveBody(method: string) {
    return HTTP_METHODS_WITHOUT_BODY.indexOf(method.toLowerCase()) === -1;
}
