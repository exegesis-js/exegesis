import * as path from 'path';
import * as exegesis from '../src';

describe('samples', function() {
    it('should load petstore without crashing', async function() {
        await exegesis.compile(path.resolve(__dirname, './samples/petstore.yaml'));
    });
});