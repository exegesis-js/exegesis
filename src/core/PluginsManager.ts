import * as exegesis from '../types';
import pb from 'promise-breaker';
import http from 'http';

function callFn(
    plugin: exegesis.ExegesisPluginInstance,
    fnName: keyof exegesis.ExegesisPluginInstance,
    param: any
) {
    const fnLength = (plugin as any)[fnName].length;
    if (fnLength < 2) {
        return (plugin as any)[fnName](param);
    } else {
        pb.call((done: exegesis.Callback<void>) => (plugin as any)[fnName](param, done));
    }
}

export default class PluginsManager {
    private readonly _plugins: exegesis.ExegesisPluginInstance[];
    private readonly _preRoutingPlugins: exegesis.ExegesisPluginInstance[];
    private readonly _postRoutingPlugins: exegesis.ExegesisPluginInstance[];
    private readonly _postSecurityPlugins: exegesis.ExegesisPluginInstance[];
    private readonly _postControllerPlugins: exegesis.ExegesisPluginInstance[];
    private readonly _postResponseValidation: exegesis.ExegesisPluginInstance[];

    constructor(apiDoc: any, plugins: exegesis.ExegesisPlugin[]) {
        this._plugins = plugins.map((plugin) => plugin.makeExegesisPlugin({ apiDoc }));

        this._preRoutingPlugins = this._plugins.filter((p) => !!p.preRouting);
        this._postRoutingPlugins = this._plugins.filter((p) => !!p.postRouting);
        this._postSecurityPlugins = this._plugins.filter((p) => !!p.postSecurity);
        this._postControllerPlugins = this._plugins.filter((p) => !!p.postController);
        this._postResponseValidation = this._plugins.filter((p) => !!p.postResponseValidation);
    }

    async preCompile(data: { apiDoc: any; options: exegesis.ExegesisOptions }) {
        for (const plugin of this._plugins) {
            if (plugin.preCompile) {
                await callFn(plugin, 'preCompile', data);
            }
        }
    }

    async preRouting(data: { req: http.IncomingMessage; res: http.ServerResponse }) {
        for (const plugin of this._preRoutingPlugins) {
            await callFn(plugin, 'preRouting', data);
        }
    }

    async postRouting(pluginContext: exegesis.ExegesisPluginContext) {
        for (const plugin of this._postRoutingPlugins) {
            await callFn(plugin, 'postRouting', pluginContext);
        }
    }

    async postSecurity(pluginContext: exegesis.ExegesisPluginContext) {
        for (const plugin of this._postSecurityPlugins) {
            await callFn(plugin, 'postSecurity', pluginContext);
        }
    }

    async postController(context: exegesis.ExegesisContext) {
        for (const plugin of this._postControllerPlugins) {
            await callFn(plugin, 'postController', context);
        }
    }

    async postResponseValidation(context: exegesis.ExegesisContext) {
        for (const plugin of this._postResponseValidation) {
            await callFn(plugin, 'postResponseValidation', context);
        }
    }
}
