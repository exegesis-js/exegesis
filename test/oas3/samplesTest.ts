import * as path from 'path';
import { defaultCompiledOptions } from '../fixtures';
import { compileRunner, compileApiInterface } from '../../src';

describe('samples', function() {
    it('should generate an exegesis runner for petstore without crashing', async function() {
        await compileRunner(
            path.resolve(__dirname, '../samples/petstore.yaml'),
            defaultCompiledOptions
        );
    });

    it('should compile the API interface for petstore', async function() {
        await compileApiInterface(
            path.resolve(__dirname, '../samples/petstore.yaml'),
            {}
        );
    });
});