import { Request } from 'express';
import { QPayClient, QPayConfig } from 'qpay-js';

export interface QPayRequest extends Request {
  qpay: QPayClient;
}

export interface QPayWebhookOptions {
  onPaymentReceived?: (invoiceId: string, result: any) => void | Promise<void>;
  onPaymentFailed?: (invoiceId: string, reason: string) => void | Promise<void>;
}
