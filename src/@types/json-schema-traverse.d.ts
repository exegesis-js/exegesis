declare module 'json-schema-traverse' {
    import { JSONSchema4, JSONSchema6 } from "json-schema";

    export interface JsonSchemaTraverser {
        (
            schema: JSONSchema4 | JSONSchema6 | any,
            jsonPtr: string,
            rootSchema: any,
            parentJsonPtr: string | undefined,
            parentKeyword: string | undefined,
            parentSchema: any | undefined,
            keyIndex: string | number | undefined
        ) : void;
    }

    export interface Options {
        allKeys: boolean;
    }

    export default function traverse(
        schema: JSONSchema4 | JSONSchema6 | any,
        opts: Options,
        cb: JsonSchemaTraverser
    ) : void;

    export default function traverse(
        schema: JSONSchema4 | JSONSchema6 | any,
        cb: JsonSchemaTraverser
    ) : void;
}