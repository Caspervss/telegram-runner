import { AxiosResponse } from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { ErrorResult } from "../api/types";
import logger from "./logger";

dayjs.extend(utc);

const markdownEscape = (str: string): string =>
  str.replace(/[.!-]/g, (c) => ({ ".": "\\.", "!": "\\!", "-": "\\-" }[c]));

const getErrorResult = (error: any): ErrorResult => {
  let errorMsg: string;

  if (error instanceof Error) {
    errorMsg = error.message;
  } else if (error?.response?.description) {
    errorMsg = error.response.description;
  } else {
    logger.error(`getErrorResult - ${error}`);

    errorMsg = "unknown error";
  }

  return {
    errors: [
      {
        msg: errorMsg
      }
    ]
  };
};

const logAxiosResponse = (res: AxiosResponse<any>) => {
  const data = JSON.stringify(res.data);
  logger.verbose(
    `${res.status} ${res.statusText} data:${
      data.length > 2000 ? " hidden" : data
    }`
  );
  return res;
};

const extractBackendErrorMessage = (error: any) =>
  error.response?.data?.errors[0]?.msg;

const getChanges = (old, current) =>
  Object.entries(current)
    .filter(([key, val]) => typeof old[key] !== "object" && old[key] !== val)
    .reduce((obj, [key, v]) => ({ ...obj, [key]: v }), {});

export {
  markdownEscape,
  getErrorResult,
  logAxiosResponse,
  extractBackendErrorMessage,
  getChanges
};
