# Exegesis Tutorial

<!-- markdownlint-disable MD007 -->
<!-- TOC depthFrom:2 -->

- [Exegesis Tutorial](#exegesis-tutorial)
  - [Project](#project)
  - [OpenAPI](#openapi)
  - [An Exegesis Server](#an-exegesis-server)
  - [The Controller](#the-controller)
  - [Giving It a Try](#giving-it-a-try)

<!-- /TOC -->
<!-- markdownlint-enable MD007 -->

This is a tutorial which will teach you how to create an OpenAPI 3.0.3 document,
and host it with Exegesis on node.js. You can find complete source for this
tutorial in the [samples](https://github.com/exegesis-js/exegesis/tree/master/samples)
directory, in both JavaScript and TypeScript.

OpenAPI 3.0.3 is the successor to Swagger - version 2.0 was known as the Swagger Specification.
While there are a few choices for implementing OpenAPI 2.0/Swagger on node.js,
Exegesis is the first complete server-framework for implementing version 3.0.X of the spec.

## Project

First, let's create the scaffold of our project:

```sh
mkdir exegesis-tutorial
cd exegesis-tutorial
mkdir controllers
npm init -y
npm install express exegesis-express
```

This creates a project folder named "exegesis-tutorial", a sub-folder
named "controllers" (where we'll put our controller implementations - the code
that gets run when someone accesses our API), creates a package.json file, and
installs the dependencies we'll need (express and exegesis-express).

## OpenAPI

The heart of any OpenAPI-based API is the OpenAPI document, which describes
all the paths and parameters your application accepts. We'll store this
in a file called "openapi.yaml". This is the simplest OpenAPI 3.0.3 document
you can write:

```yaml
openapi: 3.0.3
info:
  title: My API
  version: 1.0.0
paths:
```

The `openapi: 3.0.3` part tells us this is an OpenAPI document, and conforms
to [version 3.0.3](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.3.md)
of the spec. There's a "paths" section where we can list all the paths our API
exposes.

This has all the required fields to be an OpenAPI document, and will pass
validation, but as API documents go, this one is pretty boring. It doesn't
actually do anything. Let's fix that by adding a path:

```yaml
openapi: 3.0.3
info:
  title: My API
  version: 1.0.0
paths:
  '/greet':
    get:
      summary: Greets the user
      operationId: getGreeting
      x-exegesis-controller: greetController
      parameters:
        - description: The name of the user to greet.
          name: name
          in: query
          required: true
          schema:
            type: string
      responses:
        200:
          description: A greeting for the user.
          content:
            application/json:
              schema:
                type: object
                required:
                  - message
                properties:
                  message:
                    type: string
        default:
          description: Unexpected error.
          content:
            application/json:
              schema:
                type: object
                required:
                  - message
                properties:
                  message:
                    type: string
```

That got big fast! Let's break this down into parts.

We've added a new "/greet" to our "paths" section, with a "get" operation:

```yaml
paths:
  '/greet':
    get:
      summary: Greets the user
      operationId: getGreeting
      x-exegesis-controller: greetController
```

This means clients can send an HTTP GET to "/greet" to run this operation. This
operation also has an `operationId` of "getGreeting". This is a string that
uniquely identifies this operation, across the entire document. No other
operation is allowed to have this operationId.

There's also one extra special part we've added here, the "x-exegesis-controller".
Anything that starts with an "x-" in an OpenAPI document is called a
"specification extension". In this case, we're using an
[Exegesis-specific extension](./OAS3%20Specification%20Extensions.md)
to tell Exegesis what JS module contains the code for this controller.

The get operation also has one parameter, the "name" parameter:

```yaml
parameters:
  - description: The name of the user to greet.
    name: name
    in: query
    required: true
    schema:
      type: string
```

This parameter must be present, and must be a string. Exegesis will generate
a validation error back to the client if this field isn't present, or is the
wrong type.

Finally, there's a responses section:

```yaml
200:
  description: A greeting for the user.
  content:
    application/json:
      schema:
        type: object
        required:
          - message
        properties:
          message:
            type: string
```

This says we can reply with a 200 response, and if we do, the response is going
to be a JSON object with a single property, "message". There's also a "default"
response, which is what the client can expect if our response is not a 200
response. You can list as many different response codes here as you wish.

## An Exegesis Server

Now that we have a simple OpenAPI document, we need to have a server which
implements it. Starting with the existing project, save the above OpenAPI
document as "openapi.yaml". Then create an index.js file. This file is mostly
boilerplate:

```js
const express = require('express');
const exegesisExpress = require('exegesis-express');
const http = require('http');
const path = require('path');

async function createServer() {
  // See https://github.com/exegesis-js/exegesis/blob/master/docs/Options.md
  const options = {
    controllers: path.resolve(__dirname, 'controllers'),
    allowMissingControllers: false,
  };

  // This creates an exegesis middleware, which can be used with express,
  // connect, or even just by itself.
  const exegesisMiddleware = await exegesisExpress.middleware(
    path.resolve(__dirname, './openapi.yaml'),
    options
  );

  const app = express();

  // If you have any body parsers, this should go before them.
  app.use(exegesisMiddleware);

  // Return a 404
  app.use((req, res) => {
    res.status(404).json({ message: `Not found` });
  });

  // Handle any unexpected errors
  app.use((err, req, res, next) => {
    res.status(500).json({ message: `Internal error: ${err.message}` });
  });

  const server = http.createServer(app);

  return server;
}

createServer()
  .then(server => {
    server.listen(3000);
    console.log('Listening on port 3000');
    console.log('Try visiting http://localhost:3000/greet?name=Jason');
  })
  .catch(err => {
    console.error(err.stack);
    process.exit(1);
  });
```

The interesting bit here is really the [options](./Options.md)
we pass to Exegesis:

```js
const options = {
  controllers: path.resolve(__dirname, 'controllers'),
  allowMissingControllers: false,
};
```

`controllers` gives the path to the "controllers" folder, where we store our
controller implementations. `allowMissingControllers: false` tells Exegesis
to throw an error at startup if any of our paths don't have a controller.
There are lots of other handy [options](./Options.md)
you can pass here. Note that if you want to enable response validation,
you must pass the [`onResponseValidationError`](./Options.md#onresponsevalidationerror)
option.

## The Controller

Now we have an OpenAPI document, and we have the boilerplate that starts
the server, but the exciting part is the "controller" - this is the code
that actually implements our OpenAPI document. You may recall in our
OpenAPI document we specified:

```yaml
operationId: getGreeting
x-exegesis-controller: greetController
```

So now were going to use the folder named "controllers" that was created when
you initially created the project. In that folder we're going to create a file
called "greetController.js":

```js
// This function has the same name as an operationId in the OpenAPI document.
exports.getGreeting = function getGreeting(context) {
  const name = context.params.query.name;
  return { message: `Hello ${name}` };
};
```

This controller is pretty simple - is just reads in the name parameter, and
returns a JSON object. Controllers can optionally return a Promise, take a
callback as a second parameter, or even just write a response directly
to `context.res`.

The `context` variable here is an ["Exegesis Context"](./Exegesis%20Controllers.md),
which contains lots of [helpful info](./Exegesis%20Controllers.md#whats-in-a-context)
for when you're writing a controller.

## Giving It a Try

Start the server with:

```sh
node index.js
```

Then, try pointing your browser at [http://localhost:3000/greet?name=Jason](http://localhost:3000/greet?name=Jason),
and you should see a greeting!
