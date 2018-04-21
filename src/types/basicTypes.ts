export type Callback<T> = (err?: Error | null | undefined, value?: T) => void;

/**
 * A path to an object within a JSON document.
 */
export type JsonPath = string[];

export interface ParametersByLocation<T> {
    query: T;
    header: T;
    server: T;
    path: T;
    cookie: T;
}

// A collection of parameters from the server, path, query, cookies, etc...
export interface ParametersMap<T> {
    [key: string]: T;
}
