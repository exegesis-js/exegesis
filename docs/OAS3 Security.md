# OAS3 Security

Security in OAS3 is governed by the [Security Requirement Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#securityRequirementObject),
which defines a list of named authentication methods.  Exegesis also has a
vendor extension, "x-exegesis-roles", which is an array of strings which adds
support for restricting which operations are available to which users after they
have been authenticated.

A Security Plugin is a function which, given a context, returns a
`{user, roles, scopes}` object, or `undefined` if the user couldn't be
matched.  `user` is an arbitrary object representing the authenticated user; it
will be made available to the controller via `context.user`.  `roles` is a list
of roles which the user has, and `scopes` is a list of OAuth scopes the user is
authorized for.

Security plugins will be run, in the order they are specified in the options,
until either a plugin is found that returns a match (and which satisfies
"x-exegesis-roles", if specified), or all plugins have been run.  If a match
is found, the object returned by the security plugin will be available to
controllers via `context.security` (along with an additional `name` field which
gives the name of the security scheme which matched).  Also, `context.user` will
be the user object returned by the plugin.

Security plugins are always run prior to parameter and body parsing (if we fail
to meet security requirements, we don't want to waste time parsing and
validation; we're a busy server with requests to serve).

## OpenAPI Security Schemes

An OpenAPI document has security schemes defined in `/components/securitySchemes`:

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

And then operations have a list of security requirements (or default security
requirements can be set at the root level for all operations).  Exegesis also
allows you to specify a set of "roles" for each operation:

```yaml
paths:
  '/kittens':
    get:
        description: Get a list of kittens
        security:
            basicAuth: []
            oauth: ['readOnly']
    post:
        description: Add a new kitten
        security:
            basicAuth: []
            oauth: ['readWrite']
        x-exegesis-roles: ['admin'] # Only users with the "admin" role may call this.
```

The "get" operation can only be executed if the request matches one of the two
listed security requirements.  The "post" operation can only be executed if
the security requirements are matched, and the current "user" has the "admin"
role.

## Security Plugins

Exegesis handles security with security plugins.  These are very similar to
controllers, except their roll is to return an authenticated user:

```js
import basicAuth from 'basic-auth';
import bcrypt from 'bcrypt';

const basicAuthSecurityPlugin = async function(context) {
    const {name, pass} = basicAuth(context.req);
    const user = await db.User.find({name});

    if(!user) {
        throw context.makeError(403, "User not found");
    }
    if(!await bcrypt.compare(pass, user.password)) {
        throw context.makeError(403, "Invalid password");
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