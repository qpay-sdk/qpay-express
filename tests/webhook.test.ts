import { qpayWebhook } from '../src/webhook';

jest.mock('qpay-js', () => ({
  QPayClient: jest.fn(),
  loadConfigFromEnv: jest.fn(),
}));

describe('qpayWebhook', () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      body: {},
      qpay: {
        checkPayment: jest.fn(),
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('should return 400 if invoice_id is missing', async () => {
    req.body = {};
    const handler = qpayWebhook();
    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing invoice_id' });
  });

  it('should return 400 if body is undefined', async () => {
    req.body = undefined;
    const handler = qpayWebhook();
    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing invoice_id' });
  });

  it('should return paid status when payment rows exist', async () => {
    req.body = { invoice_id: 'INV_123' };
    req.qpay.checkPayment.mockResolvedValue({
      rows: [{ payment_id: 'PAY_1', amount: 1000 }],
    });

    const handler = qpayWebhook();
    await handler(req, res, next);

    expect(req.qpay.checkPayment).toHaveBeenCalledWith({
      objectType: 'INVOICE',
      objectId: 'INV_123',
    });
    expect(res.json).toHaveBeenCalledWith({ status: 'paid' });
  });

  it('should return unpaid status when no payment rows', async () => {
    req.body = { invoice_id: 'INV_456' };
    req.qpay.checkPayment.mockResolvedValue({ rows: [] });

    const handler = qpayWebhook();
    await handler(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ status: 'unpaid' });
  });

  it('should return unpaid when rows is null', async () => {
    req.body = { invoice_id: 'INV_789' };
    req.qpay.checkPayment.mockResolvedValue({ rows: null });

    const handler = qpayWebhook();
    await handler(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ status: 'unpaid' });
  });

  it('should call onPaymentReceived callback when payment is confirmed', async () => {
    const onPaymentReceived = jest.fn();
    req.body = { invoice_id: 'INV_123' };
    const paymentResult = { rows: [{ payment_id: 'PAY_1' }] };
    req.qpay.checkPayment.mockResolvedValue(paymentResult);

    const handler = qpayWebhook({ onPaymentReceived });
    await handler(req, res, next);

    expect(onPaymentReceived).toHaveBeenCalledWith('INV_123', paymentResult);
    expect(res.json).toHaveBeenCalledWith({ status: 'paid' });
  });

  it('should call onPaymentFailed callback when payment not found', async () => {
    const onPaymentFailed = jest.fn();
    req.body = { invoice_id: 'INV_456' };
    req.qpay.checkPayment.mockResolvedValue({ rows: [] });

    const handler = qpayWebhook({ onPaymentFailed });
    await handler(req, res, next);

    expect(onPaymentFailed).toHaveBeenCalledWith('INV_456', 'No payment found');
    expect(res.json).toHaveBeenCalledWith({ status: 'unpaid' });
  });

  it('should call onPaymentFailed and return 500 on error', async () => {
    const onPaymentFailed = jest.fn();
    req.body = { invoice_id: 'INV_ERR' };
    req.qpay.checkPayment.mockRejectedValue(new Error('API timeout'));

    const handler = qpayWebhook({ onPaymentFailed });
    await handler(req, res, next);

    expect(onPaymentFailed).toHaveBeenCalledWith('INV_ERR', 'API timeout');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'API timeout' });
  });

  it('should handle async onPaymentReceived callback', async () => {
    const onPaymentReceived = jest.fn().mockResolvedValue(undefined);
    req.body = { invoice_id: 'INV_ASYNC' };
    req.qpay.checkPayment.mockResolvedValue({
      rows: [{ payment_id: 'PAY_ASYNC' }],
    });

    const handler = qpayWebhook({ onPaymentReceived });
    await handler(req, res, next);

    expect(onPaymentReceived).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ status: 'paid' });
  });

  it('should work with empty options', async () => {
    req.body = { invoice_id: 'INV_EMPTY' };
    req.qpay.checkPayment.mockResolvedValue({
      rows: [{ payment_id: 'PAY_1' }],
    });

    const handler = qpayWebhook({});
    await handler(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ status: 'paid' });
  });

  it('should handle checkPayment returning no rows property', async () => {
    req.body = { invoice_id: 'INV_NOPROP' };
    req.qpay.checkPayment.mockResolvedValue({});

    const handler = qpayWebhook();
    await handler(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ status: 'unpaid' });
  });
});
