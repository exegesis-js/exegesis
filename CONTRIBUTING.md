# Contributing

## Supported Node Versions

Exegesis should run on node v4, v6, and v8.  We compile down to node v4.
In a perfect world, no polyfills will be required.

Exegesis should *not* add any polyfills on its own.  If there are required
polyfills, we should document what they are in README.md and let users of
this library decide which polyfills they want to include.