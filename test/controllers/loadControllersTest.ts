import path from 'path';
import { expect } from 'chai';

import * as load from '../../src/controllers/loadControllers';
import { invokeController } from '../../src/controllers/invoke';
import FakeExegesisContext from '../fixtures/FakeExegesisContext';

describe('controllers - loadControllers', function() {
    it('should load controllers from a folder', function() {
        const controllers = load.loadControllersSync(path.resolve(__dirname, './fixtures/controllers'));
        expect(Object.keys(controllers).sort()).to.eql([
            'a', 'a.js', 'b/c', 'b/c.js', 'd', 'd/index', 'd/index.js'
        ]);
    });

    it('should load controllers from a folder with a pattern', function() {
        const controllers = load.loadControllersSync(
            path.resolve(__dirname, './fixtures/controllers'),
            "b/c.js"
        );
        expect(Object.keys(controllers).sort()).to.eql([
            'b/c', 'b/c.js'
        ]);
    });

    it('should skip directories', function() {
        const controllers = load.loadControllersSync(
            path.resolve(__dirname, './fixtures/controllers'),
            "@(b|a.js)"
        );
        expect(Object.keys(controllers).sort()).to.eql([
            'a', 'a.js'
        ]);
    });

    it('should error if there are controllers that can not be loaded', function() {
        expect(
            () => load.loadControllersSync(
                path.resolve(__dirname, './fixtures/badControllers'),
                "**"
            )
        ).to.throw(`Could not load controller`);
    });

    it('should correctly load index files that are shadowed by a file in the parent folder', async function() {
        const controllers = load.loadControllersSync(path.resolve(__dirname, './fixtures/shadow'));
        const context = new FakeExegesisContext();

        expect(await invokeController(controllers['a'], controllers['a'].a, context)).to.equal('a');
        expect(await invokeController(controllers['a/index'], controllers['a/index'].a, context)).to.equal('index');
    });

});