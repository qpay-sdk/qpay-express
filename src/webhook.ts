import { RequestHandler } from 'express';
import { QPayWebhookOptions } from './types';

export function qpayWebhook(options: QPayWebhookOptions = {}): RequestHandler {
  return async (req: any, res, next) => {
    const paymentId = req.query?.qpay_payment_id as string | undefined;
    if (!paymentId) {
      res.status(400).send('Missing qpay_payment_id');
      return;
    }

    try {
      const result = await req.qpay.checkPayment({
        objectType: 'INVOICE',
        objectId: paymentId,
      });

      if (result.rows && result.rows.length > 0) {
        await options.onPaymentReceived?.(paymentId, result);
        res.status(200).send('SUCCESS');
      } else {
        await options.onPaymentFailed?.(paymentId, 'No payment found');
        res.status(200).send('SUCCESS');
      }
    } catch (err: any) {
      await options.onPaymentFailed?.(paymentId, err.message);
      res.status(500).send('FAILED');
    }
  };
}
