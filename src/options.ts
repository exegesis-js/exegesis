import ajvFormats from 'ajv-formats';
import ld from 'lodash';
import BodyParserWrapper from './bodyParsers/BodyParserWrapper';
import JsonBodyParser from './bodyParsers/JsonBodyParser';
import TextBodyParser from './bodyParsers/TextBodyParser';
import { loadControllersSync } from './controllers/loadControllers';
import {
    Authenticators,
    BodyParser,
    Controllers,
    CustomFormats,
    ExegesisOptions,
    MimeTypeParser,
    ResponseValidationCallback,
    StringParser,
} from './types';
import {
    HandleErrorFunction,
    NumberCustomFormatChecker,
    StringCustomFormatChecker,
    CustomFormatChecker,
} from './types/options';
import { MimeTypeRegistry } from './utils/mime';

export interface ExegesisCompiledOptions {
    customFormats: CustomFormats;
    controllers: Controllers;
    authenticators: Authenticators;
    bodyParsers: MimeTypeRegistry<BodyParser>;
    parameterParsers: MimeTypeRegistry<StringParser>;
    defaultMaxBodySize: number;
    ignoreServers: boolean;
    allowMissingControllers: boolean;
    autoHandleHttpErrors: boolean | HandleErrorFunction;
    onResponseValidationError: ResponseValidationCallback;
    validateDefaultResponses: boolean;
    allErrors: boolean;
    treatReturnedJsonAsPure: boolean;
    strictValidation: boolean;
}

// See the OAS 3.0 specification for full details about supported formats:
//      https://github.com/OAI/OpenAPI-Specification/blob/3.0.2/versions/3.0.2.md#data-types
const defaultValidators: CustomFormats = {
    // TODO: Support async validators so we don't need all this casting.
    int32: ajvFormats.get('int32') as NumberCustomFormatChecker,
    int64: ajvFormats.get('int64') as NumberCustomFormatChecker,
    double: ajvFormats.get('double') as NumberCustomFormatChecker,
    float: ajvFormats.get('float') as NumberCustomFormatChecker,
    // Nothing to do for 'password'; this is just a hint for docs.
    password: () => true,
    // Impossible to validate "binary".
    binary: () => true,
    byte: ajvFormats.get('byte') as RegExp,
    // Not defined by OAS 3, but it's used throughout OAS 3.0.1, so we put it
    // here as an alias for 'byte' just in case.
    base64: ajvFormats.get('byte') as RegExp,
    // Various formats we're supposed to support per the JSON Schema RFC.
    // https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-validation-00#section-7.3
    date: ajvFormats.get('date') as CustomFormatChecker,
    time: ajvFormats.get('time') as StringCustomFormatChecker,
    'date-time': ajvFormats.get('date-time') as StringCustomFormatChecker,
    duration: ajvFormats.get('duration') as RegExp,
};

export function compileOptions(options: ExegesisOptions = {}): ExegesisCompiledOptions {
    const maxBodySize = options.defaultMaxBodySize || 100000;

    const mimeTypeParsers = Object.assign(
        {
            'text/*': new TextBodyParser(maxBodySize),
            'application/json': new JsonBodyParser(maxBodySize),
        },
        options.mimeTypeParsers || {}
    );

    const wrappedBodyParsers = ld.mapValues(
        mimeTypeParsers,
        (p: StringParser | BodyParser | MimeTypeParser) => {
            if ('parseReq' in p) {
                return p;
            } else if ('parseString' in p) {
                return new BodyParserWrapper(p, maxBodySize);
            } else {
                return undefined;
            }
        }
    );
    const bodyParsers = new MimeTypeRegistry<BodyParser>(wrappedBodyParsers);

    const parameterParsers = new MimeTypeRegistry<StringParser>(
        ld.pickBy(mimeTypeParsers, (p: any) => !!p.parseString) as {
            [mimeType: string]: StringParser;
        }
    );

    const customFormats = Object.assign({}, defaultValidators, options.customFormats || {});

    const contollersPattern = options.controllersPattern || '**/*.js';
    const controllers =
        typeof options.controllers === 'string'
            ? loadControllersSync(options.controllers, contollersPattern)
            : options.controllers || {};

    const allowMissingControllers =
        'allowMissingControllers' in options ? !!options.allowMissingControllers : true;

    const authenticators: Authenticators = options.authenticators || {};

    let autoHandleHttpErrors: boolean | HandleErrorFunction = true;
    if (options.autoHandleHttpErrors !== undefined) {
        if (options.autoHandleHttpErrors instanceof Function) {
            autoHandleHttpErrors = options.autoHandleHttpErrors;
        } else {
            autoHandleHttpErrors = !!options.autoHandleHttpErrors;
        }
    }

    const validateDefaultResponses =
        'validateDefaultResponses' in options ? !!options.validateDefaultResponses : true;

    return {
        bodyParsers,
        controllers,
        authenticators,
        customFormats,
        parameterParsers,
        defaultMaxBodySize: maxBodySize,
        ignoreServers: options.ignoreServers || false,
        allowMissingControllers,
        autoHandleHttpErrors,
        onResponseValidationError: options.onResponseValidationError || (() => void 0),
        validateDefaultResponses,
        allErrors: options.allErrors || false,
        treatReturnedJsonAsPure: options.treatReturnedJsonAsPure || false,
        strictValidation: options.strictValidation ?? false,
    };
}
