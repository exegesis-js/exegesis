# Contributing

This project uses [semantic-release](https://github.com/semantic-release/semantic-release)
so commit messages should follow [Angular commit message conventions](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines).

## Supported Node Versions

Exegesis should run on node 10.x.x and up.

In a perfect world, no polyfills will be required.  Exegesis should *not* add
any polyfills on its own.  If there are required polyfills, we should document
what they are in README.md and let users of this library decide which polyfills
they want to include.
