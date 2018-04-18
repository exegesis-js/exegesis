export interface ParameterBag<T> {
    query: T;
    header: T;
    path: T;
    cookie: T;
}

// A collection of parameters from the server, path, query, cookies, etc...
export interface ParametersMap {
    [key: string]: any;
}
