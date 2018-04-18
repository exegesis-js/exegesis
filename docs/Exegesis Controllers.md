# Introduction to Controllers

Exegesis controllers are functions that take in a context, and produce a result
to return to the client.

```js
export function myController(context) {
    const name = context.params.query.name;
    context.res
        .status(200)
        .setHeader('content-type', 'application/json');
    return {message: `Hello ${name}`};
}
```

You can return a JSON object, a string, a buffer, or a readble stream.

Controllers can be asynchronous, supporting either callbacks or Promises:

```js
export function myAsyncController(context, callback) {
    callback(null, {message: 'Hello World!'});
}

export function myPromiseController(context) {
    return Promise.resolve({message: 'Hello World!'});
}
```

# What's in a context?

* `context.req` - The Node `http.IncomingMessage` from Node.js, or `http2.Http2ServerRequest` if using http2.
* `context.res` - TODO
* `context.params` - This is a `{query, header, path, cookie}` object.  Each
  member is a hash where keys are parameter names, and values are the parsed
  parameters.