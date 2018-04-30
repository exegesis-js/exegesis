
# Exegesis OpenAPI Engine
[![NPM version](https://badge.fury.io/js/exegesis.svg)](https://npmjs.org/package/exegesis)
[![Build Status](https://travis-ci.org/exegesis/exegesis.svg)](https://travis-ci.org/exegesis/exegesis)
[![Coverage Status](https://coveralls.io/repos/exegesis/exegesis/badge.svg)](https://coveralls.io/r/exegesis/exegesis)
[![Greenkeeper badge](https://badges.greenkeeper.io/exegesis-js/exegesis.svg)](https://greenkeeper.io/)

> ## *exegesis*
>
> *n.* An explanation or critical interpretation of a text, especially an
> API definition document.
>
> -- No dictionary ever

This library implements a framework-agnostic server side implementation of
[OpenAPI 3.x](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#requestBodyObject).

You probably don't want to be using this library directly.  Have a look at:

* [exegesis-express](https://github.com/exegesis-js/exegesis-express) - Middleware
  for serving OpenAPI 3.x APIs from [express](https://expressjs.com/).
* [exegesis-connect](https://github.com/exegesis-js/exegesis-express) - Middleware
  for serving OpenAPI 3.x APIs from [connect](https://github.com/senchalabs/connect).

## WARNING

🚨🚨 This is super beta. 🚨🚨

This is very much a work in progress.  Wait for the v1.0.0 release, coming soon!  :)

## Usage

```js
import * as path from 'path';
import * as http from 'http';
import * as exegesis from 'exegesis';

// See https://github.com/exegesis-js/exegesis/blob/master/docs/Options.md
const options = {
    controllers: path.resolve(__dirname, './src/controllers')
};

// `compileApi()` can either be used with a callback, or if none is provided,
// will return a Promise.
exegesis.compileApi(
    path.resolve(__dirname, './openapi/openapi.yaml'),
    options,
    (err, middleware) => {
        if(err) {
            console.error("Error creating middleware", err.stack);
            process.exit(1);
        }

        const server = http.createServer(
            (req, res) =>
                middleware(req, res, (err) => {
                    if(err) {
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

See [options documentation](https://github.com/exegesis-js/exegesis/blob/master/docs/Options.md) for details about options.
