import { Router, json } from 'express';
import { QPayConfig } from 'qpay-js';
import { qpayMiddleware } from './middleware';
import { qpayWebhook } from './webhook';
import { QPayWebhookOptions } from './types';

export function createQPayRouter(
  config?: QPayConfig,
  webhookOptions?: QPayWebhookOptions
): Router {
  const router = Router();

  router.use(json());
  router.use(qpayMiddleware(config));

  router.post('/invoice', async (req: any, res) => {
    try {
      const invoice = await req.qpay.createSimpleInvoice(req.body);
      res.json(invoice);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/check', async (req: any, res) => {
    try {
      const result = await req.qpay.checkPayment(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/webhook', qpayWebhook(webhookOptions));

  return router;
}
