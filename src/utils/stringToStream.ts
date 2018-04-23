import { Readable } from "stream";

export default function stringToStream(str: string) {
    return new Readable({
        read() {
            this.push(str);
            this.push(null);
        }
    });
}
