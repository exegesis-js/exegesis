import {parse as parseUrl} from 'url';
import * as semver from 'semver';
import * as http from 'http';
import * as oas3 from 'openapi3-ts';

import { ExgesisCompiledOptions } from '../options';
import { HttpMethod, } from '../types/common';
import { ApiInterface, ResolvedPath, ParametersMap } from '../types/ApiInterface';
import Paths from './Paths';
import Servers from './Servers';
import Oas3Context from './Oas3Context';

export default class OpenApi implements ApiInterface {
    private openApiDoc: oas3.OpenAPIObject;
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

        this.openApiDoc = openApiDoc;

        // TODO: Optimize this case when no `servers` were present in openApi doc,
        // or where we don't need to match servers (only server is {url: '/'})?
        if(!options.ignoreServers && openApiDoc.servers) {
            this._servers = new Servers(openApiDoc.servers);
        }

        this._paths = new Paths(new Oas3Context(openApiDoc, ['paths'], options));
    }

    /**
     *
     * @param method - The HTTP method used (e.g. 'GET').
     * @param url - The URL used to retrieve this request.
     * @param headers - Any headers sent along with the request.
     * @throws {ValidationError} if some parameters cannot be parsed.
     */
    resolve(
        method: HttpMethod,
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

                return {
                    serverParams,
                    parseParameters,
                    validateParameters,
                    bodyParser: mediaType && mediaType.parser,
                    validateBody,
                    // responseValidator,
                    // responseContentType?,
                    // controller,
                    openapi: {
                        openApiDoc: this.openApiDoc,
                        serverObject: oaServer,
                        pathPath: path.context.path,
                        pathObject: path.oaPath,
                        operationPath: operation && operation.context.path,
                        operationObject: operation && operation.oaOperation,
                        mediaTypePath: mediaType && mediaType.context.path,
                        mediaTypeObject: mediaType && mediaType.oaMediaType
                    }
                };
            }
        }

        return undefined;
    }
}