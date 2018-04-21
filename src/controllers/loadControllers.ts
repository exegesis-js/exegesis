import fs from 'fs';
import glob from 'glob';
import path from 'path';

import { Controllers } from '../types';

/**
 * Load a set of controllers.
 *
 * @param controllers This can either be a Controllers object (in which case it
 *   will just be returned), a path to a folder, or it can be a glob pattern.
 *   If a glob, then all files matching the glob pattern will be `require()`d
 *   and added to the resulting controllers object.  Files will be added both
 *   with and without their extension.
 *
 * @example
 *   // Assuming controllers has files "foo.js" and "bar/bar.js", then `controllers`
 *   // will be a `{"foo", "foo.js", "bar/bar.js", "bar/bar"}` object.
 *   const controllers = loadControllersSync('controlers', '**\/*.js');
 */
export function loadControllersSync(folder: string, pattern: string = "**/*.js") : Controllers {
    const controllerNames = glob.sync(pattern, {cwd: folder});

    return controllerNames.reduce<Controllers>(
        (result, controllerName) => {
            const fullPath = path.resolve(folder, controllerName);
            if(fs.statSync(fullPath).isDirectory()) {
                // Skip directories.
                return result;
            }
            try {
                // Add the file at the full path
                const mod = require(fullPath);
                result[controllerName] = mod;

                // Add the file at the full path, minus the extension
                const ext = path.extname(controllerName);
                result[controllerName.slice(0, -ext.length)] = mod;

                // If the file is an "index" file, then add it at the folder
                // name (unless there's already something there.)
                const basename = path.basename(controllerName, ext);
                if(basename === 'index') {
                    const indexFolder = controllerName.slice(0, -(ext.length + basename.length + 1));
                    result[indexFolder] = result[indexFolder] || mod;
                }
            } catch(err) {
                throw new Error(`Could not load controller '${fullPath}': ${err.message}`);
            }
            return result;
        },
        {}
    );
}