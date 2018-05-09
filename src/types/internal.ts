import * as http from 'http';

import {
    BodyParser,
    ParametersByLocation,
    ParametersMap,
    IValidationError,
    ValidatorFunction,
    Controller,
    ExegesisContext,
    ExegesisAuthenticated,
    ControllerModule,
    ExegesisPluginContext
} from '.';

export type ParsedParameterValidator =
    ((parameterValues: ParametersByLocation<ParametersMap<any>>) => IValidationError[] | null);

export interface ResolvedOperation {
    parseParameters: (() => ParametersByLocation<ParametersMap<any>>);
    validateParameters: ParsedParameterValidator;
    bodyParser: BodyParser | undefined;
    validateBody: ValidatorFunction | undefined;
    exegesisControllerName: string | undefined;
    operationId: string | undefined;
    controllerModule: ControllerModule | undefined;
    controller: Controller | undefined;

    // Returns the authentication data, or undefined if user could not be authenticated.
    authenticate(context: ExegesisContext) : Promise<{[scheme: string]: ExegesisAuthenticated} | undefined>;
    // responseValidator;
    // responseContentType?;
}

export interface ResolvedPath<T> {
    operation: ResolvedOperation | undefined;
    api: T;
}

// ApiInterface provides an interface into the `oas3` subdirectory.  The idea here is,
// when `oas4` comes along we can support it by writing a new `oas4` subdirectory
// that implements this same interface, and then we'll be able to support oas4
// wihtout changing anything.  (We'll see if this actually works.  :P)
export interface ApiInterface<T> {
    /**
     * Resolve an incoming request.
     *
     * @param method - The HTTP method used (e.g. 'GET').
     * @param url - The URL used to retrieve this request.
     * @param headers - Any headers sent along with the request.
     * @throws {ValidationError} if some parameters cannot be parsed.
     */
    resolve(
        method: string,
        url: string,
        headers: http.IncomingHttpHeaders
    ) : ResolvedPath<T> | undefined;
}

export interface ExegesisPluginInstance {
    /**
     * This function will be run after authentication is complete, but before
     * the controller is called.
     *
     * @param context - The exegsis plugin context.
     * @returns - Promise which resolves when complete.
     */
    preController(context: ExegesisPluginContext) : void | Promise<void>;
}

export interface ExegesisPlugin {
    makePlugin(doc: any) : ExegesisPluginInstance;
}
