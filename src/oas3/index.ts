import {parse as parseUrl} from 'url';
import * as semver from 'semver';
import * as http from 'http';
import * as oas3 from 'openapi3-ts';

import { ExgesisCompiledOptions } from '../types/internal';
import { ApiInterface, ResolvedPath, ParametersMap } from '../types';
import Paths from './Paths';
import Servers from './Servers';
import Oas3Context from './Oas3Context';
import { EXEGESIS_CONTROLLER, EXEGESIS_OPERATION_ID } from './extensions';

export default class OpenApi implements ApiInterface {
    private readonly _openApiDoc: oas3.OpenAPIObject;
    private readonly _options: ExgesisCompiledOptions;
    private _servers?: Servers;
    private _paths : Paths;

    /**
     * Creates a new OpenApi object.
     *
     * @param openApiDoc - The complete JSON definition of the API.
     *   The passed in definition should be a complete JSON object with no $refs.
     */
    constructor(
        openApiDoc: oas3.OpenAPIObject,
        options: ExgesisCompiledOptions
    ) {
        if(!openApiDoc.openapi) {
            throw new Error("OpenAPI definition is missing 'openapi' field");
        }
        if(!semver.satisfies(openApiDoc.openapi, '>=3.0.0 <4.0.0')) {
            throw new Error(`OpenAPI version ${openApiDoc.openapi} not supported`);
        }

        this._openApiDoc = openApiDoc;
        this._options = options;

        // TODO: Optimize this case when no `servers` were present in openApi doc,
        // or where we don't need to match servers (only server is {url: '/'})?
        if(!options.ignoreServers && openApiDoc.servers) {
            this._servers = new Servers(openApiDoc.servers);
        }

        const exegesisController = openApiDoc[EXEGESIS_CONTROLLER];

        this._paths = new Paths(new Oas3Context(openApiDoc, ['paths'], options), exegesisController);
    }

    resolve(
        method: string,
        url: string,
        headers: http.IncomingHttpHeaders
    ) : ResolvedPath | undefined {
        const parsedUrl = parseUrl(url);
        const pathname = parsedUrl.pathname || '';
        const host = parsedUrl.hostname || headers['host'] || '';
        const contentType = headers['content-type'];

        let pathToResolve : string | undefined;
        let oaServer : oas3.ServerObject | undefined;
        let serverParams : ParametersMap<string | string[]> | undefined;

        // FIXME: Different paths and operations can have their own servers object.
        // Need to first resolve the server, and then use the server to resolve
        // the path.
        if(!this._servers) {
            pathToResolve = pathname;
        } else {
            const serverData = this._servers.resolveServer(host, pathname);
            if(serverData) {
                oaServer = serverData.oaServer;
                pathToResolve = serverData.pathnameRest;
                serverParams = serverData.serverParams;
            }
        }

        if(pathToResolve) {
            const resolvedPath = this._paths.resolvePath(pathToResolve);
            if(resolvedPath) {
                const {path, rawPathParams} = resolvedPath;
                const operation = path.getOperation(method);
                const mediaType = (operation && contentType) ? operation.getRequestMediaType(contentType) : undefined;

                const parseParameters = operation && function() {
                    return operation.parseParameters({
                        headers,
                        rawPathParams,
                        serverParams,
                        queryString: parsedUrl.query || undefined
                    });
                };

                const validateParameters = operation && operation.validateParameters.bind(operation);
                const validateBody = mediaType && mediaType.validator;

                const exegesisControllerName = mediaType && (
                    mediaType.oaMediaType[EXEGESIS_CONTROLLER] ||
                    (operation && operation.exegesisController)
                );

                const operationId = mediaType && (
                    mediaType.oaMediaType[EXEGESIS_OPERATION_ID] ||
                    (operation && operation.operationId)
                );

                const controller = this._options.controllers &&
                    exegesisControllerName && operationId &&
                    this._options.controllers[exegesisControllerName] &&
                    this._options.controllers[exegesisControllerName][operationId];

                return {
                    serverParams,
                    parseParameters,
                    validateParameters,
                    bodyParser: mediaType && mediaType.parser,
                    validateBody,
                    exegesisControllerName,
                    operationId,
                    controller,
                    // responseValidator,
                    // responseContentType?,
                    openapi: {
                        openApiDoc: this._openApiDoc,
                        serverObject: oaServer,
                        pathPath: path.context.path,
                        pathObject: path.oaPath,
                        operationPath: operation && operation.context.path,
                        operationObject: operation && operation.oaOperation,
                        requestBodyMediaTypePath: mediaType && mediaType.context.path,
                        requestBodyMediaTypeObject: mediaType && mediaType.oaMediaType
                    }
                };
            }
        }

        return undefined;
    }
}