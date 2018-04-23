import * as path from 'path';
import * as oas3 from '../../src/oas3';
import { defaultCompiledOptions } from '../fixtures';

describe('samples', function() {
    it('should load petstore without crashing', async function() {
        await oas3.compile(
            path.resolve(__dirname, '../samples/petstore.yaml'),
            defaultCompiledOptions
        );
    });
});