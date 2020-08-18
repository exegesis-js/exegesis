# Parameter Parsing

<!-- markdownlint-disable MD007 -->
<!-- TOC depthFrom:2 -->

- [Parameter Parsing](#parameter-parsing)
  - [Parameter Parser Functions](#parameter-parser-functions)
  - [Cookie Parameters](#cookie-parameters)

<!-- /TOC -->
<!-- markdownlint-enable MD007 -->

Parameters in OpenAPI 3 are serialized using URI Templates from RFC 6570.
The RFC explains exactly how to convert various values into strings
(a process the RFC calls "expansion") but says nothing about going in the
opposite direction (a process the RFC doesn't even give a name, but which
we will call "parsing" for this discussion).

Since parameter parsing happens on every incoming request, the goal is to
optimize as much of parameter parsing as possible ahead-of-time. We refer
to this process here as "compiling" the parser.

The Exegesis context is expecting a `parameters` object that consists of one
key for each of the "in"s (path, query, header, cookie), and each of those
objects has parameter names for keys, mapping to the associated values:

```js
parameters = {
  path: {
    id: '5acc0981eaad142f3a754c77',
  },
  query: {
    min: 6,
    users: ['tom', 'dick', 'harry'],
    deepObject: { a: 7, b: [2, 4] },
  },
  header: {},
  cookie: {},
};
```

The path resolver extracts all the values of the path parameters for us as raw
strings and stores them in an object. Node.js does the same for us for
headers. So, our goal is: given an object of path parameters, an object
of headers, and a query string, produce the above in as short a time as possible.

The first thing to note about URI template expansion is that, using "[form-style
query expansion](https://tools.ietf.org/html/rfc6570#section-3.2.8)", without
the "explode" modifier the array `['a', 'b', 'c', 'd']` would be expanded as
`?var=a,b,c,d`, and the object `{a: 'b', c: 'd'}` would be expanded as exactly
the same thing. So the first thing we need to know about a parameter, before
we can parse the value, is the target type we're trying to parse the parameter
as. Unfortunately, OpenAPI lets us use JSON-schema to define the type, and it's
easy with `oneOf` or `anyOf` to construct a schema that could validate both
an array and an object.

So, the general approach taken, when compiling a parser for an object, is:

- If the object can only be a single type, and that type is not an object,
  then we parse the result and produce either a string or an array of strings.
  We attempt to type-coerce the resulting object to the correct basic type. If
  this fails, we throw a validation error. We don't do full validation here -
  we leave that for the validation step. So if the type of the object is
  "array", then you'll get an array of strings here. We leave it to the
  validation step to do further type coercion as required.
- If the object can be multiple types, and none of those types is "object",
  then we'll parse the object into a string or an array and let validation
  handle type coercion.
- If the object can only be a single type, and that type is an object,
  then we attempt to parse the result into an object. If this fails (because
  the "array" of values has an odd length) then we throw a validation error.
  Again, we do no formal validation here - the object may not at all match
  the schema provided, but at least it will be an object.
- If the object can be multiple types and at least one of those types is
  "object", then in a future version we'll do something clever here, like try
  to parse it as an array and do full validation and if that fails move on to
  trying to parse it as an object. Right now though, we throw an exception
  when compiling the schema. See
  [discussion here](https://github.com/OAI/OpenAPI-Specification/issues/1535#issuecomment-380032898).

## Parameter Parser Functions

At run time, parameter parsers are functions that take in some input, and produce
a value. These functions are synchronous, because it makes the parameter
code easy to work with, and we don't have the overhead of creating Promises or
dealing with callbacks.

Parser functions take in an object from a specific "in", where keys are
parameter names, and values are either a string or an array of strings. A
"path parser" function will only receive values parsed out of the path, a
"query parser" will only receive values parsed out of the query string, etc.

Parsers also receive a second parameter, a `parameterContext`, which has
information about where the parameter came from, and in the case of query
parameters has access to the original query string.

Note that values passed to parameter parsers will not be passed through
`decodeURIComponent()` first; RFC 6570 requires that characters from the
"reserved set" be %-encoded. So, for a "simple" list, a value that contains
a "," will have that "," encoded. This means we need to split the raw
value on "," and then pass each resulting string through `decodeURIComponent()`
to correctly parse a list.

There are two special cases with query parameters. The first is where you
have a query parameter which represents an object, and the "explode" option is
set. For example:

```yaml
parameter:
  name: 'myParam'
  in: query
  style: form
  explode: true
  schema:
    type: object
    properties:
      a: { type: string }
      b: { type: string }
```

This will be expanded in the query string as '?a=foo&b=bar'. Note that the name
of our parameter, 'myParam', doesn't even appear in the query string.

As a result, query parameter parsers for exploded objects are passed the entire
set of extracted values as their 'value', and simply return it. We let validation
take care of working out if the are extra fields in the object that shouldn't be
there.

The second special case is for query parameters where the style is set to "deepObject".
In this case, we parse the entire query string with the `qs` library, find the
value for the parameter name, and return this as the parsed object. Here we
don't worry about %-encoding anything, we just let `qs` handle everything.

Note that the same query parsers are used to handle `application/x-www-form-urlencoded`
bodies.

## Cookie Parameters

The format for cookie parameters is ambiguous in OpenAPI 3.0. The specification
says one thing, but the documentation on swagger.io says something else.
Until [OpenAPI-Specification #1528](https://github.com/OAI/OpenAPI-Specification/issues/1528)
is resolved, Exegesis will probably not support cookie parameters. If you have a specific
use case, please raise an issue, and we'll see if we can help you out.
