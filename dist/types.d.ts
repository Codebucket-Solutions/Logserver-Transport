import { LoggerOptions } from "winston";

export interface CustomOptions extends LoggerOptions {
  application?: string;
  service?: string;
  environment?: string;
  version?: string | number;
  host?: string;
  apiBaseUrl?:string;
  apiKey?:string;
  apiLogEndpoint?:string;
  batchInterval?:number;
  batchCount?:number;
}
