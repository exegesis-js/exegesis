import fs from 'fs';
import * as glob from 'glob';
import path from 'path';

import { Controllers, ControllerModule } from '../types';

/**
 * Load a set of controllers.
 *
 * @param folder - The folder to load controllers from.
 * @param [pattern] - A glob pattern for controllers to load.  Defaults to only
 *   .js files.
 * @param [loader] - The function to call to load each controller.  Defaults to
 *   `require`.
 *
 * @example
 *   // Assuming controllers has files "foo.js" and "bar/bar.js", then `controllers`
 *   // will be a `{"foo", "foo.js", "bar/bar.js", "bar/bar"}` object.
 *   const controllers = loadControllersSync('controlers', '**\/*.js');
 */
export function loadControllersSync(
    folder: string,
    pattern: string = '**/*.js',
    loader: (path: string) => ControllerModule = require
): Controllers {
    const controllerNames = glob.sync(pattern, { cwd: folder });

    return controllerNames.reduce<Controllers>((result, controllerName) => {
        const fullPath = path.resolve(folder, controllerName);
        if (fs.statSync(fullPath).isDirectory()) {
            // Skip directories.
            return result;
        }
        try {
            // Add the file at the full path
            const mod = loader(fullPath);
            result[controllerName] = mod;

            // Add the file at the full path, minus the extension
            const ext = path.extname(controllerName);
            result[controllerName.slice(0, -ext.length)] = mod;

            // If the file is an "index" file, then add it at the folder
            // name (unless there's already something there.)
            const basename = path.basename(controllerName, ext);
            if (basename === 'index') {
                const indexFolder = controllerName.slice(0, -(ext.length + basename.length + 1));
                result[indexFolder] = result[indexFolder] || mod;
            }
        } catch (err) {
            throw new Error(`Could not load controller '${fullPath}': ${err}`);
        }
        return result;
    }, {});
}
