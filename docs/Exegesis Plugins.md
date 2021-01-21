# Plugins

<!-- markdownlint-disable MD007 -->
<!-- TOC depthFrom:2 -->

- [Plugins](#plugins)
  - [Writing a Plugin](#writing-a-plugin)

<!-- /TOC -->
<!-- markdownlint-enable MD007 -->

Plugins can be used to add functionality to Exegesis.

Today Exegesis only supports OpenAPI 3.x.x (OAS3), however the core of Exegesis
was designed to allow it to handle other API specifications. Exegesis
divides the execution of an API up into the following phases:

- **Routing** - Any REST base API will define a set of URLs or URIs which map to
  various functions and resources. Exegesis first examines the URL to work out
  which resource is being accessed. In OAS3, this means matching a Server
  Object and Path Object.
- **Security** - After routing is finished, but before we do any work parsing input,
  Exegesis will figure out if the request is authenticated and authorized to
  access the given route. In OAS3, this means checking the Security Object
  associated with the route, and verifying that at least one of the Security
  Requirements has been met.
- **Input Parsing and Validation** - Exegesis takes a "lazy" approach to parsing
  both parameters and the request body; the body and parameters are parsed
  and validated the first time they are accessed. This allows authenticators
  and plugins access to the body and parameters if required, but also means
  if no one asks for the parameters or the body, we won't bother to parse
  them. However, to make writing controllers easier, if they have not be parsed
  by this point Exegesis explicitly parses them and stores them in
  `context.params` and `context.requestBody`.
- **Controller** - Exegesis calls into a controller to run business logic
  associated with the resource being accessed.
- **Response Validation** - Exegesis optionally validates that the response
  has been correctly generated. For OAS3, this means checking the response
  against the response schema.

Finally, the response is written out back to the client.

Plugins allow you to add functionality before (almost) any of these phases,
and even to modify the API document before it is compiled.

## Writing a Plugin

Plugins are published on NPM with the prefix `exegesis-plugin-` to make it
easy to find plugins.

To write a plugin, you write a JavaScript module which exports a default function.
This function accepts a single parameter which is an object with the options to
configure your plugin. It returns a `{info, makeExegesisPlugin(data)}` object.
`makeExegesisPlugin` takes a single parameter, an `{apiDoc}` object. Right now
the API document will always be an OAS3 document, however this may not be the
case in the future, so plugins should take care to verify the document they are
being passed is in the format they expect.

The `makeExegesisPlugin` function should return an `ExegesisPluginInstance`
object. This has functions which will be called at various phases for each
request. See the example below for a list of functions that can be defined.
Each function can either take a callback function as the last parameter, or
return a Promise. See the example below.

Plugins are free to modify the `apiDoc` object in the `makeExegesisPlugin()`
function (although they may not replace it with an entirely new object). This
is the only time that plugins may modify the document.

In any phase, plugins can also generate a response by writing to
`context.res.body`, or can add headers to `context.res.headers`. Plugins must
_not_ write to `context.origRes`. Writing a response will cause subsequent
phases and plugins to be skipped, and if the controller has not yet been called,
the controller will be skipped. The exception to this is the `postController()`
function, which will always be called for a plugin, even if a previous phase has
written a response.

```js
import * as semver from 'semver';

function makeExegesisPlugin({apiDoc}) {
  // Verify the apiDoc is an OpenAPI 3.x.x document, because this plugin
  // doesn't know how to handle anything else.
  if (!apiDoc.openapi) {
    throw new Error("OpenAPI definition is missing 'openapi' field");
  }
  if (!semver.satisfies(apiDoc.openapi, '>=3.0.0 <4.0.0')) {
    throw new Error(`OpenAPI version ${apiDoc.openapi} not supported`);
  }

  // Can make modifications to apiDoc at this point, such as adding new
  // routes, or modifying documentation - whatever you want to do.  Just
  // keep in mind that other plugins might make changes, also, either before
  // or after this.  If you need the "final" apiDoc, see `preCompile`.

  // Return an ExegesisPluginInstance.
  return {
    // Called exactly once, before Exegesis "compiles" the API document.
    // Plugins must not modify apiDoc here.
    preCompile({apiDoc, options}) {
    }

    // Called before routing.  Note that the context hasn't been created yet,
    // so you just get a raw `req` and `res` object here.
    preRouting({req, res}) {
    }

    // Called immediately after the routing phase.  Note that this is
    // called before Exegesis verifies routing was valid - the
    // `pluginContext.api` object will have information about the
    // matched route, but will this information may be incomplete.
    // For example, for OAS3 we may have matched a route, but not
    // matched an operation within the route. Or we may have matched
    // an operation but that operation may have no controller defined.
    // (If we failed to match a route at all, this will not be called.)
    //
    // If your API added a route to the API document, this function is a
    // good place to write a reply.
    //
    // Note that calling `pluginContext.getParams()` or `pluginContext.getRequestBody()`
    // will throw here if routing was not successful.
    postRouting(pluginContext) {
    }

    // Called for each request, after security phase and before input
    // is parsed and the controller is run.  This is a good place to
    // do extra security checks.  The `exegesis-plugin-roles` plugin,
    // for example, generates a 403 response here if the authenticated
    // user has insufficient privliedges to access this path.
    //
    // Note that this function will not be called if a previous plugin
    // has already written a response.
    postSecurity(pluginContext) {
    }

    // Called immediately after the controller has been run, but before
    // any response validation.  This is a good place to do custom
    // response validation.  If you have to deal with something weird
    // like XML, this is where you'd handle it.
    //
    // This function can modify the contents of the response.
    postController(context) {
    }

    // Called after the response validation step.  This is the last step before
    // the response is converted to JSON and written to the output.
    postResponseValidation(context) {
    }
  };
}

export default function plugin(options) {
  return {
    info: {
      // This should match the name of your npm package.
      name: 'exegesis-plugin-example'
    },
    makeExegesisPlugin
  };
}
```
