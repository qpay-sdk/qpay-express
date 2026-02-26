import { RequestHandler } from 'express';
import { QPayClient, QPayConfig, loadConfigFromEnv } from 'qpay-js';

let clientInstance: QPayClient | null = null;

export function qpayMiddleware(config?: QPayConfig): RequestHandler {
  return (req: any, _res, next) => {
    if (!clientInstance) {
      const cfg = config ?? loadConfigFromEnv();
      clientInstance = new QPayClient(cfg);
    }
    req.qpay = clientInstance;
    next();
  };
}
