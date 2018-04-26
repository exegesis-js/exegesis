# Exegesis OpenAPI Engine

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

## Usage

```js
import * as path from 'path';
import * as http from 'http';
import * as exegesis from 'exegesis';

// See https://github.com/exegesis-js/exegesis/blob/master/docs/Options.md
const options = {
    controllers: './src/controllers'
};

const middleware = exegesis.compileApi(
    path.resolve(__dirname, './openapi/openapi.yaml'),
    options
);

const server = http.createServer(
    (req, res) =>
        middleware(req, res, (err) => {
            if(err) {
               res.writeHead(500);
               res.end(`Internal error: ${err.message}`);
            } else {
                res.writeHead(404);
                res.end();
            }
        });
).listen(3000);
```

See [options documentation](https://github.com/exegesis-js/exegesis/blob/master/docs/Options.md) for details about options.