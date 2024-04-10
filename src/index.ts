import Transport from "winston-transport";
import {
  LEVEL, //Sabke niklenge
  MESSAGE,
} from "triple-beam";
import { CustomOptions } from "./types";
import axios, { Axios, AxiosError, AxiosResponse } from "axios";
import build from "pino-abstract-transport";

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

class GeneralLogger {
  private axiosInstance: Axios;
  private logEndpoint: string;
  private batchInterval: number;
  private batchCount: number;
  private batchOptions: logType[];
  private batchTimeoutID: ReturnType<typeof setTimeout> | number;
  private batchCallback: (options: callbackType) => void;
  constructor(opts: CustomOptions) {
    this.logEndpoint = opts.apiLogEndpoint ? opts.apiLogEndpoint : "log";
    this.batchCount = opts.batchCount ? opts.batchCount : 20;
    this.batchInterval = opts.batchInterval ? opts.batchInterval : 5000;
    this.axiosInstance = axios.create({
      baseURL: opts.apiBaseUrl,
      headers: { "x-api-key": opts.apiKey },
    });
    this.batchOptions = [];
    this.batchTimeoutID = 0;
    this.batchCallback = () => {};
  }

  _doBatch(options: logType, callback: (options: callbackType) => void) {
    this.batchOptions.push(options);
    if (this.batchOptions.length === 1) {
      // First message stored, it's time to start the timeout!
      const me = this;
      this.batchCallback = callback;
      this.batchTimeoutID = setTimeout(function () {
        // timeout is reached, send all messages to endpoint
        me.batchTimeoutID = 0;
        me._doBatchRequest(me.batchCallback);
      }, this.batchInterval);
    }
    if (this.batchOptions.length === this.batchCount) {
      // max batch count is reached, send all messages to endpoint
      this._doBatchRequest(this.batchCallback);
    }
  }

  _doBatchRequest(callback: (options: callbackType) => void) {
    if (this.batchTimeoutID) {
      clearTimeout(this.batchTimeoutID);
      this.batchTimeoutID = 0;
    }
    const batchOptionsCopy = this.batchOptions.slice();
    this.batchOptions = [];
    this._doRequest(batchOptionsCopy, callback);
  }

  _doRequest(options: logType[], callback: (options: callbackType) => void) {
    this.axiosInstance
      .post(this.logEndpoint, { logs: options })
      .then(function (response: AxiosResponse) {
        callback({ response });
      })
      .catch(function (error: AxiosError) {
        callback({ error });
      });
  }
}

export class LogserverTransport extends Transport {
  private generalLogger: GeneralLogger;
  private application?: string;
  private environment?: string;
  private service?: string;
  private host?: string;
  private version?: string | number;
  constructor(opts: CustomOptions) {
    super(opts);
    this.application = opts.application;
    this.environment = opts.environment;
    this.service = opts.service;
    this.host = opts.host;
    this.version = opts.version;
    this.generalLogger = new GeneralLogger(opts);
  }

  _logTransform(info: any): logType {
    for (let key of Object.keys(info)) {
      if (!info[key]) delete info[key];
      if (typeof info[key] === "object") {
        info[key] = JSON.stringify(info[key]);
      }
    }
    return {
      ...info,
      timestamp: info.timestamp ? info.timestamp : new Date().toISOString(),
      version: info.version ? info.version : this.version,
      service: info.service ? info.service : this.service,
      application: info.application ? info.application : this.application,
      environment: info.environment ? info.environment : this.environment,
      logLevel: info[LEVEL],
      host: info.host ? info.host : this.host,
      message: info.message ? info.message : info[MESSAGE],
    };
  }

  log(info: any, callback?: () => void) {
    this.generalLogger._doBatch(
      this._logTransform(info),
      (options: callbackType) => {
        if (options.error) {
          this.emit("warn", options.error.message);
        } else if (options.response) {
          if (options.response.data.success) {
            this.emit("logged", info);
          } else {
            this.emit("warn", options.response.data.message);
          }
        }
      }
    );
    if (callback) {
      setImmediate(callback);
    }
  }
}

const levels: Record<number, string> = {
  10: "trace",
  20: "debug",
  30: "info",
  40: "warn",
  50: "error",
  60: "fatal",
};

let _logTransform = (info: any, opts: CustomOptions) => {
  for (let key of Object.keys(info)) {
    if (!info[key]) delete info[key];
    if (typeof info[key] === "object") {
      info[key] = JSON.stringify(info[key]);
    }
  }
  if (info.time) info.timestamp = new Date(info.time).toISOString();
  return {
    ...info,
    timestamp: info.timestamp ? info.timestamp : new Date().toISOString(),
    version: info.version ? info.version : opts.version,
    service: info.service ? info.service : opts.service,
    application: info.application ? info.application : opts.application,
    environment: info.environment ? info.environment : opts.environment,
    logLevel: info.level
      ? typeof info.level == "string"
        ? info.level
        : levels[info.level]
      : "",
    host: info.host ? info.host : opts.host,
    message: info.msg,
  };
};

export default async function (opts: CustomOptions) {
  const generalLogger = new GeneralLogger(opts);
  return build(async function (source) {
    for await (const obj of source) {
      if (!obj) {
        return;
      }
      generalLogger._doBatch(
        _logTransform(obj, opts),
        (options: callbackType) => {
          if (options.error) {
            console.warn(
              "PINO LOGSERVER LOGGER ERROR: " + options.error.message
            );
          } else if (options.response) {
            if (!options.response.data.success) {
              console.warn(
                "PINO LOGSERVER LOGGER ERROR: " + options.response.data.message
              );
            }
          }
        }
      );
    }
  });
}
