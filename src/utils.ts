import pino from 'pino';
import stdSerializers from 'pino-std-serializers';

export const match = (a, b, caseIncensitive = true) => {
  if (a === null || a === undefined) {
    return false;
  }

  if (Array.isArray(b)) {
    if (caseIncensitive) {
      return b.map((x) => x.toLowerCase()).includes(a.toLowerCase());
    }

    return b.includes(a);
  }

  if (caseIncensitive) {
    return a.toLowerCase() === b.toLowerCase();
  }

  return a === b;
};

export const logger = pino({
  quietReqLogger: true,
  base: null,
  level: 'debug',
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  serializers: {
    error: stdSerializers.err,
  },
  formatters: {
    level: (label) => ({ level: label }),
    log: (msgObject: any) => {
      if (msgObject.context && msgObject.message) {
        const { context, message, ...rest } = msgObject;

        return { msg: `${context} > ${message}`, ...rest };
      }

      return msgObject;
    },
  },
  useLevelLabels: true,
});
