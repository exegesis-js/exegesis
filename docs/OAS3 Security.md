# OAS3 Security

Each operation in OAS3 can have a list of [Security Requirement Objects](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#securityRequirementObject)
associated with it, in `security` (or inherited from the root document's `security`).
Each security requirement object has a list of security schemes; in order to
access an operation, a request must satisfy all security schemes for at least
one of the objects in the list.

When compiling your API, Exegesis will takes an `authenticators` option which
maps security schemes to authenticators.  An `authenticator` is a
function which tries to authenticate the user using a given scheme.

## Authenticators

An authenticator is a function which authenticates a request.

```js
async function promiseAuthenticator(pluginContext, info) {...}
function callbackAuthenticator(pluginContext, info, done) {...}
```

For example:

```js
async function sessionAuthenticator(pluginContext, info) {
    const session = pluginContext.req.headers.session;
    if(!session) {
        return { type: 'missing', statusCode: 401, message: 'Session key required' };
    } else if(session === 'secret') {
        return { type: 'success', user: { name: 'jwalton', roles: ['read', 'write'] } };
    } else {
        // Session was supplied, but it's invalid.
        return { type: 'invalid', statusCode: 401, message: 'Invalid session key' };
    }
}

const options : exegesis.ExegesisOptions = {
    controllers: path.resolve(__dirname, './controllers'),
    authenticators: {
        sessionKey: sessionAuthenticator
    }
};
```

Authenticators are very similar to controllers, except their roll is to
return an authentication information.  Note that the `context` passed to an
authenticator is a "plugin context" - this differs from a regular context
in that `body` and `params` will be undefined as they have not been
parsed yet (although access to the body and parameters are available via
the async functions `getRequestBody()` and `getParams()`).  Authenticators are also
passed an `info` object, which is either a `{in, name}` object describing
what field the authentication information should be stored in, or else a
`{scheme}` object describing the HTTP authentication scheme being used,
as described in [RFC 7235](https://tools.ietf.org/html/rfc7235#section-5.1).

If the user is successfully authenticated, an authenticator should return a
`{type: "success", user, roles, scopes}` object.  `user` is an arbitrary object
representing the authenticated user; it will be made available to the controller
via the context. `roles` is a list of roles which the user has (used by
[exegesis-plugin-roles](https://github.com/exegesis-js/exegesis-plugin-roles)),
and `scopes` is a list of OAuth scopes the user is authorized for.  Authenticators
may also add additional data to this object (for example, when authenticating
via OAuth, you might set the `user` to the user the OAuth token is for, and also
set an `oauthClient` property to identify that this user was authenticated by
OAuth.)

If the user did not provide credentials, the authenticator should return a
`{type: 'missing', challenge, status, message}` object.  If
`challenge` is specified it must be an
[RFC 7235 challenge](https://tools.ietf.org/html/rfc7235#section-2.1), suitable
for including in a WWW-Authenticate header.

If the user provided authentication credentials, but they are invalid,
the authenticator should return a `{type: 'invalid', challenge, status, message}`
object.

If a authenticator returns `undefined`, this is treated like 'missing'.

When Exegesis routes a request, it will run the relevant authenticators
and decide whether or not to allow the request.  Note that if an operation has
no `security`, then no authenticators will be run.

If a request successfully matches a security requirement object then Exegesis
will create a `context.security` object with the details of the matched schemes.
This will be available to the controller which handles the operation.

Authenticators are run prior to body parsing, however the body is available via
the async function `context.getRequestBody()` if it is needed.

### Example: Basic Auth

```js
import basicAuth from 'basic-auth';
import bcrypt from 'bcrypt';

// Note that authenticators can either return a Promise, or take a callback.
async function basicAuthSecurity(pluginContext, info) {
    const credentials = basicAuth(pluginContext.req);
    if(!credentials) {
        // The request failed to provide a basic auth header.
        return {type: 'missing', challenge: info.scheme};
    }

    const {name, pass} = credentials;
    const user = await db.User.find({name});
    if(!user) {
        return {
            type: 'invalid',
            challenge: info.scheme,
            message: `User ${name} not found`
        };
    }
    if(!await bcrypt.compare(pass, user.password)) {
        return {
            type: 'invalid',
            challenge: info.scheme,
            message: `Invalid password for ${name}`
        };
    }

    return {
        type: 'success',
        user,
        roles: user.roles, // e.g. `['admin']`, or `[]` if this user has no roles.
        scopes: [] // Ignored in this case, but if `basicAuth` was an OAuth
                   // security scheme, we'd fill this with `['readOnly', 'readWrite']`
                   // or similar.
    };
}
```

### Example: Basic Auth with Passport

Here's the exact same example, but using [Passport](http://www.passportjs.org/):

```js
import exegesisPassport from 'exegesis-passport';
import passport from 'passport';
import { BasicStragety } from 'passport-http';
import bcrypt from 'bcrypt';

// Note the name of the auth scheme here should match the name of the security
// role.
passport.use('basicAuth', new BasicStrategy(
    function(name, password, done) {
        db.User.find({name}, (err, user) => {
            if(err) {return done(err);}
            bcrypt.compare(password, user.password, (err, matched) => {
                if(err) {return done(err);}
                return done(null, matched ? user : false);
            }
        });
    }
));

const basicAuthAuthenticator = passportSecurity('basicAuth');
```

## Example

Here's an example of the securitySchemes section from an OpenAPI document:

```yaml
  securitySchemes:
    basicAuth: A request with a username and password
      type: http
      scheme: basic
    oauth:
      description: A request with an oauth token.
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://api.exegesis.io/oauth/authorize
          tokenUrl: https://api.exegesis.io/oauth/token
          scopes:
            readOnly: "Read only scope."
            readWrite: "Read/write scope."
```

Operations have a list of security requirements:

```yaml
paths:
  '/kittens':
    get:
        description: Get a list of kittens
        security:
            - basicAuth: []
            - oauth: ['readOnly']
```

The "get" operation can only be executed if the request matches one of the two
listed security requirements.

If a user authenticated using `basicAuth`, then the controller would have
access to the object returned by the authenticator via `context.security.basicAuth`.
Simliarly, if the request used oauth, then `context.security.oauth` would be
populated with the result of the oauth authenticator.

### Using Multiple Authentication Types

Some REST APIs support several authentication types. The security section lets you combine the security requirements
using logical OR and AND to achieve the desired result.

While the [Security requirement object section of the Open API Spec](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#security-requirement-object)
specifies that `only one of Security Requirement Objects in the list needs to be satisfied to authorize the request` this
library follows the principal of least privilege by **failing authorisation if *any* of the authenticators return an `invalid` result**.
One side affect of this decision is that all authenticators will run for every request to ensure that there are no invalid results.

#### Scenarios

```yaml
security:    # A OR B
  - A
  - B
```

* The request will authenticate if **either** `A` or `B` return a `success` result and **none** return an `invalid` result.
* `A` will run first then `B`
* The authentication process will return the result of the first successful authenticator.
* If a authenticator returns an invalid result the authentication process will be halted and the invalid result will be returned.

```yaml
security:    # A AND B
  - A
    B
```

* The request will authenticate only if **both** `A` and `B` return a `success` result and **none** return an `invalid` result.
* `A` will run first then `B`
* The authentication process will return the result of both the successful authenticators.
* If a authenticator returns an invalid result the authentication process will be halted and the invalid result will be returned.

```yaml
security:    # (A AND B) OR (C AND D)
  - A
    B
  - C
    D
```

* The request will authenticate only if (`A` and `B`) OR (`C` AND `D`) return a success a `success` result and **none** return an `invalid` result.