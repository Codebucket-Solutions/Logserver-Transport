/// <reference types="node" />
import Transport from "winston-transport";
import { CustomOptions } from "./types";
import build from "pino-abstract-transport";
type logType = {
    timestamp?: string;
    version?: string | number;
    service?: string;
    application?: string;
    environment?: string;
    logLevel?: string;
    host?: string;
    message?: string;
};
export declare class LogserverTransport extends Transport {
    private generalLogger;
    private application?;
    private environment?;
    private service?;
    private host?;
    private version?;
    constructor(opts: CustomOptions);
    _logTransform(info: any): logType;
    log(info: any, callback?: () => void): void;
}
export default function (opts: CustomOptions): Promise<import("stream").Transform & build.OnUnknown>;
export {};
//# sourceMappingURL=index.d.ts.map