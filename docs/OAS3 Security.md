# OAS3 Security

Each operation in OAS3 can have a list of [Security Requirement Objects](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#securityRequirementObject)
associated with it, in `security` (or inherited from the root document's `security`).
Each security requirement object has a list of security schemes; in order to
access an operation, a request must satisfy all security schemes for at least
one of the objects in the list.

Exegesis also has a vendor extension,
["x-exegesis-roles"](https://github.com/exegesis-js/exegesis/blob/master/docs/OAS3%20Specification%20Extensions.md#x-exegesis-roles),
which is an array of strings which adds support for restricting which operations
are available to which users after they have been authenticated.

When compiling your API, Exegesis will takes an `authenticators` option which
maps security schemes to authenticators.  An `authenticator` is a
function which tries to authenticate the user using a given scheme.  See
below for more details.

For example:

```js
async function sessionAuthenticator(pluginContext) {
    const session = pluginContext.req.headers.session;
    if(!session) {
        return { type: 'fail', statusCode: 401, message: 'Session key required' };
    } else if(session === 'secret') {
        return { type: 'success', user: { name: 'jwalton', roles: ['read', 'write'] } };
    } else {
        // Session was supplied, but it's invalid.
        return { type: 'fail', statusCode: 401, message: 'Invalid session key' };
    }
}

const options : exegesis.ExegesisOptions = {
    controllers: path.resolve(__dirname, './controllers'),
    authenticators: {
        sessionKey: sessionAuthenticator
    }
};
```

When Exegesis routes a request, it will run the relevant authenticators
and decide whether or not to allow the request.  Note that if an operation has
no `security`, then no authenticators will be run.

If a request successfully matches a security requirement object then Exegesis
will create a `context.security` object with the details of the matched schemes.
This will be available to the controller which handles the operation.

Authenticators are run prior to body parsing, however the body is available via
the async function `context.getBody()` if it is needed.

## An Example

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
    post:
        description: Add a new kitten
        security:
            - basicAuth: []
            - oauth: ['readWrite']
        x-exegesis-roles: ['admin'] # Only users with the "admin" role may call this.
```

The "get" operation can only be executed if the request matches one of the two
listed security requirements.  The "post" operation can only be executed if
the security requirements are matched, and the current "user" has the "admin"
role.

If a user authenticated using `basicAuth`, then the controller would have
access to the object returned by the authenticator via `context.security.basicAuth`.

## Authenticators

Authenticators are very similar to controllers, except their roll is to
return an authenticated user.  Note that the `context` passed to an
authenticator is a "plugin context" - this differs from a regular context
in that `body` and `params` will be undefined as they have not been
parsed yet (although access to the body and parameters are available via
the async functions `getBody()` and `getParams()`).

If the user is successfully authenticated, an authenticator should return a
`{type: "success", user, roles, scopes}` object.  `user` is an arbitrary object
representing the authenticated user; it will be made available to the controller
via the context. `roles` is a list of roles which the user has, and `scopes` is
a list of OAuth scopes the user is authorized for.  Authenticators may also add
additional data to this object (for example, when authenticating via OAuth,
you might set the `user` to the user the OAuth token is for, and also set an
`oauthClient` property to identify that this user was authenticated by OAuth.)

If the user is not authenticated, the authenticator should return a
`{type: 'fail', challenge, status, message}` object, or undefined.  If
`challenge` is specified it must be an
[RFC 7235 challenge](https://tools.ietf.org/html/rfc7235#section-2.1), suitable
for including in a WWW-Authenticate header.

```js
import basicAuth from 'basic-auth';
import bcrypt from 'bcrypt';

async function basicAuthSecurity(pluginContext) {
    const credentials = basicAuth(pluginContext.req);
    if(!credentials) {
        // The request failed to provide a basic auth header.  Return undefined
        // to indicate we failed to meet the requirements.
        return undefined;
    }

    const {name, pass} = credentials;
    const user = await db.User.find({name});
    if(!user) {
        return {
            type: 'fail',
            challenge: 'Basic',
            message: `User ${name} not found`
        };
    }
    if(!await bcrypt.compare(pass, user.password)) {
        return {
            type: 'fail',
            challenge: 'Basic',
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

### Passport

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

const basicAuthAuthenticator = exegesisPassport('basicAuth',
    (context, user) => ({
        user,
        roles: user.roles
    })
);

// Or, if you're not using roles:
const basicAuthAuthenticator = passportSecurity('basicAuth');
```
