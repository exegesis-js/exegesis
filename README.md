# Exegesis OpenAPI Engine

[![NPM version](https://badge.fury.io/js/exegesis.svg)](https://npmjs.org/package/exegesis)
![Build Status](https://github.com/exegesis-js/exegesis/workflows/GitHub%20CI/badge.svg)
[![Coverage Status](https://coveralls.io/repos/exegesis-js/exegesis/badge.svg)](https://coveralls.io/r/exegesis-js/exegesis)
[![Greenkeeper badge](https://badges.greenkeeper.io/exegesis-js/exegesis.svg)](https://greenkeeper.io/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

> ## _exegesis_
>
> _n._ An explanation or critical interpretation of a text, especially an
> API definition document.
>
> -- No dictionary ever

This library implements a framework-agnostic server side implementation of
[OpenAPI 3.x](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#requestBodyObject).

## Description

Exegesis is a library for implementing server-side OpenAPI 3.x The library has been
written in such a way that hopefully it will also be used to implement future
versions of OpenAPI, or possibly even other API description standards altogether.

You probably don't want to be using this library directly. Have a look at:

- [exegesis-express](https://github.com/exegesis-js/exegesis-express) - Middleware
  for serving OpenAPI 3.x APIs from [express](https://expressjs.com/) or
  [connect](https://github.com/senchalabs/connect).
- [exegesis-koa](https://github.com/confuser/exegesis-koa) - Middleware
  for serving OpenAPI 3.x APIs from [koa](https://koajs.com/).

## Features

- Full support for OpenAPI 3.x.x (see [issues tagged with conformance](https://github.com/exegesis-js/exegesis/issues?q=is%3Aissue+is%3Aopen+label%3Aconformance) for areas which could use some improvement).
- Built in support for "application/json" and "application/x-www-form-urlencoded" requests
- Can use express [body parser middlewares](https://github.com/exegesis-js/exegesis/blob/master/docs/Options.md#mimetypeparsers)
- [Response validation](https://github.com/exegesis-js/exegesis/blob/master/docs/Options.md#onresponsevalidationerror)
- [Authentication support](https://github.com/exegesis-js/exegesis/blob/master/docs/OAS3%20Security.md)
- [Plugins](https://github.com/exegesis-js/exegesis/tree/master/docs) allow easy extensibility
- Easy support for [validating custom formats](https://github.com/exegesis-js/exegesis/blob/master/docs/Options.md#customformats)

## Tutorial

Check out the tutorial [here](https://github.com/exegesis-js/exegesis/blob/master/docs/Tutorial.md).

## API

### compileApi(openApiDoc, options[, done])

This function takes an API document and a set of
[options](https://github.com/exegesis-js/exegesis/blob/master/docs/Options.md),
and returns a connect-style middleware function which will execute the API.

`openApiDoc` is either a path to your openapi.yaml or openapi.json file,
or it can be a JSON object with the contents of your OpenAPI document. This
should have the [`x-exegesis-controller`](https://github.com/exegesis-js/exegesis/blob/master/docs/OAS3%20Specification%20Extensions.md)
extension defined on any paths you want to be able to access.

`options` is described in detail [here](https://github.com/exegesis-js/exegesis/blob/master/docs/Options.md). At a
minimum, you'll probably want to provide `options.controllers`, a path to where
your [controller modules](https://github.com/exegesis-js/exegesis/blob/master/docs/Exegesis%20Controllers.md)
can be found. If you have any security requirements defined, you'll also
want to pass in some [authenticators](https://github.com/exegesis-js/exegesis/blob/master/docs/OAS3%20Security.md).
To enable response validation, you'll want to provide a validation callback
function via [`onResponseValidationError()`](https://github.com/exegesis-js/exegesis/blob/master/docs/Options.md#onresponsevalidationerror).
Exegesis's functionality can also be extended using [plugins](https://github.com/exegesis-js/exegesis/tree/master/docs),
which run on every request. Plugins let you add functionality like
[role base authorization](https://github.com/exegesis-js/exegesis-plugin-roles),
or CORS.

### compileRunner(openApiDoc, options[, done])

This function is similar to `compileApi`; it takes an API document and a set of
[options](https://github.com/exegesis-js/exegesis/blob/master/docs/Options.md),
and returns a "runner". The runner is a `function runner(req, res)`, which takes
in a standard node HTTP request and response. It will not modify the response,
however. Instead it returns (either via callback or Promise) and `HttpResult`
object. This is a `{headers, status, body}` object, where `body` is a readable
stream, read to be piped to the response.

### writeHttpResult(httpResult, res[, done])

A convenience function for writing an `HttpResult` from a runner out to the
response.

## Example

```js
import * as path from 'path';
import * as http from 'http';
import * as exegesis from 'exegesis';

// See https://github.com/exegesis-js/exegesis/blob/master/docs/Options.md
const options = {
  controllers: path.resolve(__dirname, './src/controllers'),
};

// `compileApi()` can either be used with a callback, or if none is provided,
// will return a Promise.
exegesis.compileApi(
  path.resolve(__dirname, './openapi/openapi.yaml'),
  options,
  (err, middleware) => {
    if (err) {
      console.error('Error creating middleware', err.stack);
      process.exit(1);
    }

    const server = http.createServer((req, res) =>
      middleware(req, res, (err) => {
        if (err) {
          res.writeHead(err.status || 500);
          res.end(`Internal error: ${err.message}`);
        } else {
          res.writeHead(404);
          res.end();
        }
      })
    );

    server.listen(3000);
  }
);
```

## Internal Workings

Internally, when you "compile" an API, Exegesis produces an
[ApiInterface](https://github.com/exegesis-js/exegesis/blob/f5266dfd27cdb40c5ebf8063303acbf483d78ed9/src/types/internal.ts#L50) object.
This is an object that, given a method, url, and headers, returns a
[`resolvedOperation`](https://github.com/exegesis-js/exegesis/blob/f5266dfd27cdb40c5ebf8063303acbf483d78ed9/src/types/internal.ts#L21) -
essentially a collection of functions that will parse and validate the body and
parameters, has the controller that executes the functionality, etc... The only
current implementation for an ApiInterface is the
[`oas3/OpenApi` class](https://github.com/exegesis-js/exegesis/blob/master/src/oas3/OpenApi.ts).
Essentially this class's job is to take in an OpenAPI 3.x.x document, and turn it
an ApiInterface that Exegesis can use. In theory, however, we could parse some
other API document format, produce an ApiInterface, and Exegsis would still be
able to run it.
