import chai from 'chai';
import http from 'http';
import 'mocha';
import { ExegesisPlugin, ExegesisPluginInstance } from '../../src';
import generateExegesisRunner from '../../src/core/exegesisRunner';
import PluginsManager from '../../src/core/PluginsManager';
import { FakeApiInterface } from '../fixtures/FakeApiInterface';

const { expect } = chai;

describe('Plugin Test', function () {
    it('should run all the phases of a plugin on a request', async function () {
        const callOrder: string[] = [];

        const controller = () => {
            callOrder.push('controller');
        };

        const api = new FakeApiInterface(controller);

        const pluginInstance: ExegesisPluginInstance = {
            preCompile() {
                callOrder.push('preCompile');
            },

            preRouting() {
                callOrder.push('preRouting');
            },

            postRouting() {
                callOrder.push('postRouting');
            },

            postSecurity() {
                callOrder.push('postSecurity');
            },

            postController() {
                callOrder.push('postController');
            },

            postResponseValidation() {
                callOrder.push('postResponseValidation');
            },
        };

        const plugin: ExegesisPlugin = {
            info: {
                name: 'dummyPlugin',
            },
            makeExegesisPlugin() {
                return pluginInstance;
            },
        };

        const plugins = new PluginsManager({}, [plugin]);

        const runner = await generateExegesisRunner(api, {
            autoHandleHttpErrors: false,
            plugins,
            validateDefaultResponses: false,
            originalOptions: {},
        });

        await runner({} as http.IncomingMessage, {} as http.ServerResponse);

        expect(callOrder).to.eql([
            // Note: no preCompile here, because it would be called when compiling options.
            'preRouting',
            'postRouting',
            'postSecurity',
            'controller',
            'postController',
            'postResponseValidation',
        ]);
    });
});
