import Transport from "winston-transport";
import { CustomOptions } from "./types";
import { AxiosError, AxiosResponse } from "axios";
type callbackType = {
    response?: AxiosResponse;
    error?: AxiosError;
};
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
export default class LogstashTransport extends Transport {
    private axiosInstance;
    private application?;
    private environment?;
    private service?;
    private host?;
    private version?;
    private logEndpoint;
    private batchInterval;
    private batchCount;
    private batchOptions;
    private batchTimeoutID;
    private batchCallback;
    constructor(opts: CustomOptions);
    _logTransform(info: any): logType;
    log(info: any, callback?: () => void): void;
    _doBatch(options: logType, callback: (options: callbackType) => void): void;
    _doBatchRequest(callback: (options: callbackType) => void): void;
    _doRequest(options: logType[], callback: (options: callbackType) => void): void;
}
export {};
//# sourceMappingURL=index.d.ts.map