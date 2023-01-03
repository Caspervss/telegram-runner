import { createLogger, format, transports } from "winston";
import config from "../config";

const { printf, combine, colorize, timestamp, errors } = format;

const createCustomLogger = () => {
  const devLogFormat = printf((log) => {
    let msg = `${log.timestamp} ${log.level}: ${log.message}`;
    if (log.stack) {
      msg += log.stack;
    }

    if (config.nodeEnv === "production") {
      msg = msg.replaceAll("\n", "\t");
    }

    if (log.meta) {
      msg += ` - ${JSON.stringify(log?.meta)}`;
    }

    return msg;
  });

  return createLogger({
    level: "verbose",
    format:
      config.nodeEnv === "production"
        ? combine(
            timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            errors({ stack: true }),
            devLogFormat
          )
        : combine(
            colorize(),
            timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            errors({ stack: true }),
            devLogFormat
          ),
    transports: [new transports.Console()]
  });
};

const logger = createCustomLogger();

export default logger;
