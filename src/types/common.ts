export const HTTP_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE'];

export type Callback<T> = (err: Error | null | undefined, value?: T) => void;