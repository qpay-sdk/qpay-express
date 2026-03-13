import { Request } from 'express';
import { QPayClient, QPayConfig } from 'qpay-js';

export interface QPayRequest extends Request {
  qpay: QPayClient;
}

export interface QPayWebhookOptions {
  onPaymentReceived?: (paymentId: string, result: any) => void | Promise<void>;
  onPaymentFailed?: (paymentId: string, reason: string) => void | Promise<void>;
}
