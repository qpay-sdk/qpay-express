import { RequestHandler } from 'express';
import { QPayWebhookOptions } from './types';

export function qpayWebhook(options: QPayWebhookOptions = {}): RequestHandler {
  return async (req: any, res, next) => {
    const invoiceId = req.body?.invoice_id;
    if (!invoiceId) {
      res.status(400).json({ error: 'Missing invoice_id' });
      return;
    }

    try {
      const result = await req.qpay.checkPayment({
        objectType: 'INVOICE',
        objectId: invoiceId,
      });

      if (result.rows && result.rows.length > 0) {
        await options.onPaymentReceived?.(invoiceId, result);
        res.json({ status: 'paid' });
      } else {
        await options.onPaymentFailed?.(invoiceId, 'No payment found');
        res.json({ status: 'unpaid' });
      }
    } catch (err: any) {
      await options.onPaymentFailed?.(invoiceId, err.message);
      res.status(500).json({ error: err.message });
    }
  };
}
