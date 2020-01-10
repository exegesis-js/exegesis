# Parameter Parsing

Cookie parameters are not well defined by OAS3, so at the moment Exegesis
doesn't support them. See discussion
[here](https://github.com/OAI/OpenAPI-Specification/issues/1528). If you
really need cookie parameters, please raise an issue.

Parameters in OAS3 come in two different flavors; parameters with a
"content-type" which are parsed using a custom string parser (e.g. an
"application/json" parameter) and parameters that are parsed using a "style".
This document covers styled parameters.

## OAS3 Styles

- matrix - Path-style expansion from RFC6570 - `{;var}`
- form - Form-style Query expansion from RFC6570 - `{?var}`
- label - Label expansion from RFC6570 - `{.var}`
- simple - Simple string expansion from RFC6570 - `{var}`
- spaceDelimited
- pipeDelimited
- deepObject - `qs` style form parameters.

Allowed styles by parameter location:

- path: 'matrix', 'label', 'simple'
- query: 'form', 'spaceDelimited', pipeDelimited', 'deepObject'
- cookie: 'form' ???
- header: 'simple'

For `query` we also have to worry about 'allowEmptyValue' and 'allowReserved'.
It's not clear to me that these have any effect on the parsing side, though.

To parse a given parameter, we need to know:

- The parameter name.
- The style of the parameter.
- If the parameter is exploded.
- The type or types we are allowed to decode the parameter to (some combination
  of "string", "array", "object" - we don't worry about numbers or integers -
  strings can be converted to these other basic types).
- For exploded parameters, it would be nice to have a list of expected property
  names.

## Implementation

While OAS3 is largely based on RFC6570, aside from the query string, OAS3 never
allows us to have two variables in the same expression (e.g. in URI Templates
you can do `{foo,bar}`).

We do a pre-processing step and extract all the variables out of the path
into a dictionary where variables are keyed by name (wouldn't be able to do this
with full RF6570 templates, because you can have multiple variables in the
same expression e.g. `/path/{foo,bar}`). We extract all the querystring
variables out by passing the querystring through a querty string parser (although
we do _not_ call `decodeURIComponent()` on values, since pct-encoded ","s are
different from ","s for RFC6570 expansions). node.js will extract all the
headers for us in a similar fashion.

For most cases, a parameter parser could take in just a string or array of
strings. Path-style expansions and query-style expansions throw a wrench into
this, however, because an exploded parameter will need to read values from keys
other than the parameter name.

So a parameter parser is a function of the form:

```js
    function(name, rawValues, querystring)
```

Given a function which just takes in a string or array of strings, we can
convert that into the above function trivially, so where possible parameter
parsers just take in the raw value for their name.

Parsers always try to return _something_. If we're given a query parameter
that can only be a string, but the query parameter is in the query string more
than once, we'll produce an array of strings, and validation will take care of
realizing that something is wrong. Parsers can also return a "string" when
an array is wanted, and we'll do type cooercion to fix the array after the fact.
