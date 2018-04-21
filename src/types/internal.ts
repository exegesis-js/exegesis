import { Controllers, CustomFormats, StringParser, BodyParser } from '.';
import { MimeTypeRegistry } from "../utils/mime";

export interface ExgesisCompiledOptions {
    customFormats: CustomFormats;
    controllers?: Controllers;
    bodyParsers: MimeTypeRegistry<BodyParser>;
    parameterParsers: MimeTypeRegistry<StringParser>;
    maxParameters: number;
    defaultMaxBodySize: number;
    ignoreServers: boolean;
}
