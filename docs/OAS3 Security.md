# OAS3 Security

Each operation in OAS3 can have a list of [Security Requirement Objects](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#securityRequirementObject)
associated with it, in `security` (or inherited from the root document's `security`).
Each security requirement object has a list of security schemes; in order to
access an operation, a request must satisfy all security schemes for at least
one of the objects in the list.

Exegesis also has a vendor extension, "x-exegesis-roles", which is an array of
strings which adds support for restricting which operations are available to
which users after they have been authenticated.

When compiling your API, Exegesis will takes a `securityPlugins` option which
maps security schemes to Security Plugins.  A Security Plugin is a function
which, given a context, returns a `{user, roles, scopes}` object, or `undefined`
if the scheme couldn't be satisfied.  `user` is an arbitrary object representing
the authenticated user; it will be made available to the controller via the
context.  `roles` is a list of roles which the user has, and `scopes` is a list
of OAuth scopes the user is authorized for.

For example:

```js
async function sessionSecurityPlugin(context) {
    const session = context.req.headers.session;
    if(!session) {
        return undefined;
    } else if(session === 'secret') {
        return {
            user: {name: 'jwalton'}
        };
    } else {
        throw context.makeError(403, "Invalid session");
    }
}

const options : exegesis.ExegesisOptions = {
    controllers: path.resolve(__dirname, './controllers'),
    securityPlugins: {
        sessionKey: sessionAuthSecurityPlugin
    }
};
```

When Exegesis routes a request, it will run the relevant Security Plugins and
decide whether or not to allow the request.  Note that if an operation has
no `security`, then no plugins will be run.

If a request successfully matches a security requirement object (and all plugins
satisfy "x-exegesis-roles" if it is specified), then Exegesis will create a
`context.security` object with the details of the matched schemes.  This
will be available to the controller which handles the operation.

Security plugins are run prior to body parsing, however the body is available
via the async function `context.getBody()` if it is needed.

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

And then operations have a list of security requirements:

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
access to the object returned by the Security Plugin via
`context.security.basicAuth`.

## Security Plugins

Security plguins are very similar to controllers, except their roll is to
return an authenticated user:

```js
import basicAuth from 'basic-auth';
import bcrypt from 'bcrypt';

async function basicAuthSecurityPlugin(context) {
    const credentials = basicAuth(context.req);
    if(!credentials) {
        // The request failed to provide a basic auth header.  Return undefined
        // to indicate we failed to meet the requirements.
        return undefined;
    }

    const {name, pass} = credentials;
    const user = await db.User.find({name});
    if(!user) {
        // The user *tried* to authenticate, but gave us a bad username.
        // We can return `undefined` here, but in this case we want to reject
        // this request even if it matches some other secuirty scheme, because
        // clearly something is wrong.
        throw context.makeError(403, `User ${name} not found`);
    }
    if(!await bcrypt.compare(pass, user.password)) {
        throw context.makeError(403, `Invalid password for ${name}`);
    }

    return {
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
import passportSecurityPlugin from 'exegesis-passport';
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

const basicAuthSecurityPlugin = passportSecurityPlugin('basicAuth',
    (context, user, info) => ({
        user,
        roles: user.roles
    })
);

// Or, if you're not using roles:
const basicAuthSecurityPlugin = passportSecurityPlugin('basicAuth');
```
