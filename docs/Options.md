# Exegesis Options

<!-- markdownlint-disable MD007 -->
<!-- TOC depthFrom:2 -->

- [controllers](#controllers)
- [allowMissingControllers](#allowmissingcontrollers)
- [authenticators](#authenticators)
- [mimeTypeParsers](#mimetypeparsers)
- [defaultMaxBodySize](#defaultmaxbodysize)
- [customFormats](#customformats)
- [ignoreServers](#ignoreservers)
- [autoHandleHttpErrors](#autohandlehttperrors)

<!-- /TOC -->
<!-- markdownlint-enable MD007 -->

## controllers

Controllers are functions that Exegesis executes to handle incoming requests.
You can read about controllers
[here](https://github.com/exegesis-js/exegesis/blob/master/docs/Exegesis%20Controllers.md).

The `controllers` option tells Exegesis how to find controller functions to
call.  This can either be the name of a folder containing controller modules,
or it can be a has where keys are controller names.  If it is a folder,
you can additionally specified `controllersPattern`, which is a glob pattern
telling Exegesis which files to load.

For example, suppose you have a folder in your project named "src/controllers",
which contains "Pets.js" and "Users.ts".  If you're loading your OpenAPI
document in "/src/index.js", you could specify `controllers`
as:

```js
import * as path from 'path';
{
    controllers: path.resolve(__dirname, 'controllers'),
    controllersPattern: "**/*.@(ts|js)"
```

Then you can use [`x-exegesis-controller: Pets`](https://github.com/exegesis-js/exegesis/blob/master/docs/OAS3%20Specification%20Extensions.md)
in your OpenAPI document to reference the "Pets.js" module, and use either
`operationId` or `x-exegesis-operationId` to reference a function within the
module.

## allowMissingControllers

If false, then if any operations do not define a controller, Exegesis will raise
an error when the API is being compiled.  If true, then Exegesis will simply
pretend any operations that don't have a controller do not exist, and will not
handle them.

Defaults to true.

## authenticators

An hash of authenticators.  Keys are security scheme names from your
OpenAPI document, values are authenticator functions.  See [OAS3 Security](https://github.com/exegesis-js/exegesis/blob/master/docs/OAS3%20Security.md)
for details.

## mimeTypeParsers

A hash where keys are either mime types or mimetype wildcards (e.g. 'text/*'),
and values are parsers.

This option is used to control how Exegesis parses message bodies and certain
parameters.  By default, parsers are provided for 'text/*' and
'application/json'.

A parser is either an object of the form:

```js
{
    /**
     * Synchronous function which parses a string.  A BodyParser must implement
     * this function to be used for parameter parsing.
     *
     * @param {string} encoded - The encoded value to parse.
     * @returns - The decoded value.
     */
    parseString(encoded) {...}
}
```

Or:

```js
{
    /**
     * Async function which parses an incoming HTTP request.  This is essentially
     * here so you can use express/connect body parsers.
     *
     * @param {http.IncomingMessage} req - The request to read.  This function
     *   should add `req.body` after parsing the body.  If `req.body` is already
     *   present, this function can ignore the body and just call `next()`.
     * @param {http.ServerResponse} res - The response object.  Well behaved
     *   body parsers should *not* write anything to the response or modify it
     *   in any way.
     * @param next - Callback to call when complete.  If no value is returned
     *   via the callback then `req.body` will be used as the body.
     */
    parseReq(req, res, next) {...}
}
```

In order to be used for parsing parameters, a parser must implement
`parseString()`.  A parser that does not implement `parseReq()` can
still be used for parsing request bodies.

## defaultMaxBodySize

If a `MimeTypeParser` provided in `mimeTypeParsers` does not support
`parseReq()`, this defines the maximum size of a body that will be parsed.
Bodies longer than this will result in a "413 - Payload Too Large" error.
Built in body parsers will also respect this option.

## customFormats

If you use the "format" specifier in your OpenAPI document with custom defined
formats, you must provide validation functions for each format used.

`customFormats` is a hash where keys are format names.  Values can be one of:

- A RegExp for checking a string.
- A `function(string) : boolean` for checking a string, which returns
  false the the string is invalid.
- A `{validate, type}` object, where `type` is either "string" or "number",
  and validate is a `function(string) : boolean`.

## ignoreServers

OpenAPI 3.x lets you specify what servers your API is available on.  For example:

```yaml
servers:
  - url: '/api/v2'
```

By default, exegesis will take 'servers' into account when routing requests,
so if you have the above servers section, and a path in your API called
"/users", then exegesis will only match the route if the incoming requests has
the URL "/api/v2/users".

If you have path templates in your servers, the variables will be available to
your controllers via `context.params.server`.

If you specify the `ignoreServers` option, however, exegesis will ignore the
servers section, an route purely based on your paths.

## autoHandleHttpErrors

By default, ExegesisRunner will turn `exegesis.HttpError`s (such as errors
generated from `context.makeError()`, `exegesis.ValidationError`s, or any error
with a `.status` into JSON replies with appropriate error messages.  If you want
to handle these errors yourself, set this value to false.

Note that all `HttpError`s will have a `.status` property with a suggested
numeric HTTP response code.