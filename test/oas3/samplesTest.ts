import * as path from 'path';
import { defaultCompiledOptions } from '../fixtures';
import { compileRunner } from '../../src';

describe('samples', function() {
    it('should load petstore without crashing', async function() {
        await compileRunner(
            path.resolve(__dirname, '../samples/petstore.yaml'),
            defaultCompiledOptions
        );
    });
});