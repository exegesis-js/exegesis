// import { expect } from 'chai';
import * as path from 'path';
import * as exegesis from '../../../src';

describe('Issue 132 test', function () {
    it('should load a yaml file with recursive definitions', async function () {
        await exegesis.compileApi(path.resolve(__dirname, './openapi.yaml'), {});
    });
});
