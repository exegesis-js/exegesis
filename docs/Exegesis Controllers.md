# Introduction to Controllers

<!-- markdownlint-disable MD007 -->
<!-- TOC depthFrom:2 -->

- [Writing Controllers](#writing-controllers)
- [Specifying a Controller to Run](#specifying-a-controller-to-run)
- [What's in a Context?](#whats-in-a-context)

<!-- /TOC -->
<!-- markdownlint-enable MD007 -->

## Writing Controllers

Exegesis controllers are functions that take in a context, and produce a result to return to the client.

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

## Specifying a Controller to Run

Controllers are defined inside modules (.js files).  In order to resolve a controller, you specify both the name of the module, and the name of the function to call within the module.  Here's a quick example:

```yaml
openapi: 3.0.1
info:
    title: Example
    version: 1.0.0
paths:
    "/users"
        x-exegesis-controller: userController
        get:
            operationId: getUsers
```

Here, we'd find a module named "userControler.js", and then we'd call into `getUsers(context)` within that module.

If you have a path that takes input in multiple different formats, you can also specify the `operationId` in the MediaType object, using `x-exegesis-operationId`:

```yaml
openapi: 3.0.1
info:
    title: Example
    version: 1.0.0
paths:
    "/users"
        x-exegesis-controller: userController
        post:
            content:
                application/json:
                    schema: {}
                    x-exegesis-operationId: getUsersJson
                multipart/form-data:
                    schema: {}
                    x-exegesis-operationId: getUsersMultipart
```

You may specify `x-exegesis-controller` in any of the following:

- [OpenAPI Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#oasObject)
- [Paths Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#pathsObject)
- [Path Item Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#pathItemObject)
- [Operation Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#operationObject)
- [Media Type Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#mediaTypeObject) within the Operation Object's `requestBody.content[string]`.

Exegesis will start from the Media Type Object specified by a given request, and walk it's way upwards to find the "closest" `x-exegesis-controller`, and then do the same for `x-exegesis-operationId`.  This will uniquely identify which controller module and function to call.

## What's in a Context?

- `context.req` - The Node `http.IncomingMessage` from Node.js, or `http2.Http2ServerRequest` if using http2.
- `context.res` - TODO
- `context.params` - This is a `{query, header, path, cookie}` object.  Each member is a hash where keys are parameter names, and values are the parsed parameters.