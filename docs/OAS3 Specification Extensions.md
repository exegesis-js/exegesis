# Controllers

## x-exegesis-controller

Controls which module defines the controller for an operation.
`x-exegesis-controller` may contains "/"s if controllers are organized in a
heirarchy.

Allowed in:

* [OpenAPI Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#oasObject)
* [Paths Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#pathsObject)
* [Path Item Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#pathItemObject)
* [Operation Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#operationObject)
* [Media Type Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#mediaTypeObject) within the Operation Object's `requestBody.content[string]`.

Definitions at lower levels override definitions at higher levels.

## x-exegesis-operationId

Controls which operation is called within a controller.

Allowed in:

* [Operation Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#operationObject) - If `operationId` and `x-exegesis-operationId` are both specified, then `x-exegesis-operationId` takes precedence.
* [Media Type Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#mediaTypeObject) within the Operation Object's `requestBody.content[string]`.

Definitions at lower levels override definitions at higher levels.  Defitions in Operation or Media Type Object also override `operationId` in the Operation Object.

## x-exegesis-roles

This is used to control which users have access to a given operation.
Authenticators can optionally return "roles" for a user.  This can be
specified either as an array of "role" strings, or as an array of such arrays.

For example:

```yaml
x-exegesis-roles:
  - a
  - b
```

would only allow access to an operation if a user has both the 'a' and 'b'
role, or:

```yaml
x-exegesis-roles:
  - [a]
  - [b, c]
```

would only allow access to an operation if a user has the 'a' role, or has
both the 'b' and 'c' role.

"x-exegesis-roles" can be defined on the root OpenAPI object, in which case
all operations in the document will require those roles.  This can be overridden
by specifying "x-exegesis-roles" in an individual operation.  An emptry array
indicates a user requires no roles:

```yaml
x-exegesis-roles: []
```

If "x-exegesis-roles" is defined on an operation which has no security
requirements defined, this will throw an error.

Roles do not apply to security schemes with the "oauth2" type; scopes apply
there instead.

Allowed in:

* [OpenAPI Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#oasObject)
* [Operation Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#operationObject)
