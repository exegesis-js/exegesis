import { ExegesisPluginInstance, ExegesisPlugin, Callback, ExegesisPluginContext, ExegesisContext } from "../types";
import pb from 'promise-breaker';

function callFn(
    plugin: ExegesisPluginInstance,
    fnName: string,
    param : any
) {
    const fnLength = (plugin as any)[fnName].length;
    if(fnLength < 2) {
        return (plugin as any)[fnName](param);
    } else {
        pb.call((done : Callback<void>) => (plugin as any)[fnName](param, done));
    }
}

export default class PluginsManager {
    private readonly _plugins: ExegesisPluginInstance[];
    private readonly _postRoutingPlugins: ExegesisPluginInstance[];
    private readonly _postSecurityPlugins: ExegesisPluginInstance[];
    private readonly _postControllerPlugins: ExegesisPluginInstance[];

    constructor(apiDoc: any, plugins: ExegesisPlugin[]) {
        this._plugins = plugins.map(plugin => plugin.makeExegesisPlugin({apiDoc}));

        this._postRoutingPlugins = this._plugins.filter(p => !!p.postRouting);
        this._postSecurityPlugins = this._plugins.filter(p => !!p.postSecurity);
        this._postControllerPlugins = this._plugins.filter(p => !!p.postController);
    }

    async preCompile(data: {apiDoc: any}) {
        for(const plugin of this._plugins) {
            if(plugin.preCompile) {
                await callFn(plugin, 'preCompile', data);
            }
        }
    }

    async postRouting(pluginContext: ExegesisPluginContext) {
        for(const plugin of this._postRoutingPlugins) {
            await callFn(plugin, 'postRouting', pluginContext);
        }
    }

    async postSecurity(pluginContext: ExegesisPluginContext) {
        for(const plugin of this._postSecurityPlugins) {
            await callFn(plugin, 'postSecurity', pluginContext);
        }
    }

    async postController(context: ExegesisContext) {
        for(const plugin of this._postControllerPlugins) {
            await callFn(plugin, 'postController', context);
        }
    }

}