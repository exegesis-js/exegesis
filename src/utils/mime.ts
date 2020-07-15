// A mime-type, per RFC 7231 section 3.1.1.1
const TCHAR = "[!#$%&'*+-.^_`|~A-Za-z0-9]";
const TOKEN = `${TCHAR}+`;
const OWS = '[ \t]*';
const MIME_TYPE_REGEX = new RegExp(`^(${TOKEN})/(${TOKEN})${OWS}(.*)$`);

export interface ParsedMimeType {
    type: string;
    subtype: string;
}

/**
 * Parses a mimeType into a `{type, subtype}` object.
 * Parameters provided with the mimeType are ignored.
 */
export function parseMimeType(mimeType: string): ParsedMimeType {
    const match = MIME_TYPE_REGEX.exec(mimeType);
    if (!match) {
        throw new Error(`Invalid MIME type: "${mimeType}"`);
    }
    if (match[3] && match[3][0] !== ';') {
        throw new Error(`Invalid MIME type: "${mimeType}"`);
    }
    return { type: match[1].toLowerCase(), subtype: match[2].toLowerCase() };
}

function isParsedMimeType(val: string | ParsedMimeType): val is ParsedMimeType {
    return !!((val as ParsedMimeType).type && (val as ParsedMimeType).subtype);
}

export class MimeTypeRegistry<T> {
    // This is a registry of mime types with no wildcards.
    private _staticMimeTypes: { [mimeType: string]: T } = Object.create(null);
    // This is a registry of "types" for mime types where the subtype was wildcarded.
    private _wildcardSubtypes: { [mimeType: string]: T } = Object.create(null);
    // If someone registers "*/*", it goes here.
    private _defaultMimeType: T | undefined;

    constructor(map?: { [mimeType: string]: T | undefined } | undefined) {
        if (map) {
            for (const mimeType of Object.keys(map)) {
                const t = map[mimeType];
                if (t) {
                    this.set(mimeType, t);
                }
            }
        }
    }

    set(mimeType: string | ParsedMimeType, value: T) {
        const { type, subtype } = isParsedMimeType(mimeType) ? mimeType : parseMimeType(mimeType);

        if (type === '*' && subtype === '*') {
            this._defaultMimeType = value;
        } else if (subtype === '*') {
            this._wildcardSubtypes[type] = value;
        } else if (type === '*') {
            throw new Error(
                `Do not allow wildcarding mime "type" unless also wildcarding "subtype": ${mimeType}`
            );
        } else {
            this._staticMimeTypes[`${type}/${subtype}`] = value;
        }
    }

    get(mimeType: string | ParsedMimeType): T | undefined {
        const { type, subtype } = isParsedMimeType(mimeType) ? mimeType : parseMimeType(mimeType);

        return (
            this._staticMimeTypes[`${type}/${subtype}`] ||
            this._wildcardSubtypes[type] ||
            this._defaultMimeType
        );
    }

    getRegisteredTypes() {
        const answer = Object.keys(this._staticMimeTypes).concat(
            Object.keys(this._wildcardSubtypes).map((type) => `${type}/*`)
        );

        if (this._defaultMimeType) {
            answer.push('*/*');
        }

        return answer;
    }
}
