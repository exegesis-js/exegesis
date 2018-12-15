# Introduction to Controllers

<!-- markdownlint-disable MD007 -->
<!-- TOC depthFrom:2 -->

- [Writing Controllers](#writing-controllers)
- [Specifying a Controller to Run](#specifying-a-controller-to-run)
- [What's in a Context?](#whats-in-a-context)

<!-- /TOC -->
<!-- markdownlint-enable MD007 -->

## Writing Controllers

Exegesis controllers are functions that take in a context, and produce a result
to return to the client.  This is one of the simplest controllers you can
write:

```js
export function myController(context) {
    const name = context.params.query.name;
    return {message: `Hello ${name}`};
}
```

This will return the object provided as a JSONdocs response.  You can return a
JSON object, a string, a buffer, or a readble stream.  You can also more
explicitly set the body by setting `res.body` or calling `res.setBody()`
or `res.json()`:

```js
export function myController(context) {
    const name = context.params.query.name;
    context.res
        .status(200)
        .set('content-type', 'application/json');
        .setBody({message: `Hello ${name}`});
}
```

Controllers can be asynchronous, supporting either callbacks or Promises:

```js
export function myAsyncController(context, callback) {
    callback(null, {message: 'Hello World!'});
}

export function myPromiseController(context) {
    return Promise.resolve({message: 'Hello World!'});
}
```

Controllers can, of course, also return non-JSON data:

```js
export function myController(context) {
    const name = context.params.query.name;
    context.res
        .status(200)
        .setHeader('content-type', 'text/xml')
        .setBody(`<message>Hello ${name}</message>`);
}
```

Note, however, that response validation will not be done if the body is not a
JSON object.

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

- `context.req` - The Node `http.IncomingMessage` from Node.js.
- `context.res` - A `Exegesis Response` object.  This is very similar to a
  `http.ServerResponse`, and has many functions that will be familiar if you're
  used to express.
- `context.origRes` - This is the original `http.ServerResponse` from Node.js.
  In general you should not write directly to `context.origRes`.  Exegesis will
  be unable to do response validation if you write directly to the origRes
  object.
- `context.params` - This is a `{query, header, path, server, cookie}` object.
  Each member is a hash where keys are parameter names, and values are the
  parsed parameters.
- `context.parameterLocations` - This is a mirror of the `context.params` object,
  but instead of parameter values, this has parameter locations.  (`server`
  parameters are not preset in `parameterLocations` in the current release.)
- `context.requestBody` - The parsed message body, if one is present.
- `context.security` - This is a dictionary where keys are security schemes,
  and values are `{user, roles, scope}` objects (as returned by the associated
  [authenticator](./OAS3%20Security.md)).  For OAS3, there will only be objects
  here for the first matched security requirement.
- `context.user` - This is a user, as returned by an authenticator.  For OAS3
  this will only be present if the matched security requirement had exactly
  one security scheme.
- `context.api` - This is an object containing details about which parts of
  the OpenAPI document were resolved to service your request.  For OAS3 this
  will be an object with the following fields:

  - `openApiDoc` - The OpenAPI document for your API.  This is a "bundled" object,
    with all extenral $refs resolved, and only internal $refs remaining.
  - `serverObject` - The Server Object which was matched.
  - `serverPtr` - A JSON Pointer to the server object in `openApiDoc`.
  - `pathItemObject` - The Path Item Object which was matched.
  - `pathItemPath` - A JSON Pointer to the path item object.
  - `operationObject` - The matched Operation Object.
  - `operationPtr` - A JSON Pointer to the Operation Object.
  - `requestBodyMediaTypeObject` - The matched MediaType Object from the operation's
    `requestBody`, or null if none was matched or the Operation has no requestBody.
  - `requestBodyMediaTypePtr` - A JSON Pointer to the MediaType Object.

- `context.makeError(statusCode, message)` is a convenience function which
  will create a new Error object with a status.  Note that this does not
  throw the error - your code has to do that.

- `context.makeValidationError(message, location)` is a convenience function which
  will creates a new validation error.  `location` should be a parameter location
  from `context.parameterLocations`.  Note that this does not throw the error - your
  code has to do that.
