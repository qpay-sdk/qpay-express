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
      query: {},
      qpay: {
        checkPayment: jest.fn(),
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('should return 400 if qpay_payment_id is missing', async () => {
    req.query = {};
    const handler = qpayWebhook();
    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Missing qpay_payment_id');
  });

  it('should return 400 if query is undefined', async () => {
    req.query = undefined;
    const handler = qpayWebhook();
    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Missing qpay_payment_id');
  });

  it('should return SUCCESS when payment rows exist', async () => {
    req.query = { qpay_payment_id: '493622150113497' };
    req.qpay.checkPayment.mockResolvedValue({
      rows: [{ payment_id: 'PAY_1', amount: 1000 }],
    });

    const handler = qpayWebhook();
    await handler(req, res, next);

    expect(req.qpay.checkPayment).toHaveBeenCalledWith({
      objectType: 'INVOICE',
      objectId: '493622150113497',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('SUCCESS');
  });

  it('should return SUCCESS even when no payment rows', async () => {
    req.query = { qpay_payment_id: '493622150113498' };
    req.qpay.checkPayment.mockResolvedValue({ rows: [] });

    const handler = qpayWebhook();
    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('SUCCESS');
  });

  it('should return SUCCESS when rows is null', async () => {
    req.query = { qpay_payment_id: '493622150113499' };
    req.qpay.checkPayment.mockResolvedValue({ rows: null });

    const handler = qpayWebhook();
    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('SUCCESS');
  });

  it('should call onPaymentReceived callback when payment is confirmed', async () => {
    const onPaymentReceived = jest.fn();
    req.query = { qpay_payment_id: '493622150113497' };
    const paymentResult = { rows: [{ payment_id: 'PAY_1' }] };
    req.qpay.checkPayment.mockResolvedValue(paymentResult);

    const handler = qpayWebhook({ onPaymentReceived });
    await handler(req, res, next);

    expect(onPaymentReceived).toHaveBeenCalledWith('493622150113497', paymentResult);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('SUCCESS');
  });

  it('should call onPaymentFailed callback when payment not found', async () => {
    const onPaymentFailed = jest.fn();
    req.query = { qpay_payment_id: '493622150113498' };
    req.qpay.checkPayment.mockResolvedValue({ rows: [] });

    const handler = qpayWebhook({ onPaymentFailed });
    await handler(req, res, next);

    expect(onPaymentFailed).toHaveBeenCalledWith('493622150113498', 'No payment found');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('SUCCESS');
  });

  it('should call onPaymentFailed and return FAILED on error', async () => {
    const onPaymentFailed = jest.fn();
    req.query = { qpay_payment_id: '493622150113500' };
    req.qpay.checkPayment.mockRejectedValue(new Error('API timeout'));

    const handler = qpayWebhook({ onPaymentFailed });
    await handler(req, res, next);

    expect(onPaymentFailed).toHaveBeenCalledWith('493622150113500', 'API timeout');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('FAILED');
  });

  it('should handle async onPaymentReceived callback', async () => {
    const onPaymentReceived = jest.fn().mockResolvedValue(undefined);
    req.query = { qpay_payment_id: '493622150113501' };
    req.qpay.checkPayment.mockResolvedValue({
      rows: [{ payment_id: 'PAY_ASYNC' }],
    });

    const handler = qpayWebhook({ onPaymentReceived });
    await handler(req, res, next);

    expect(onPaymentReceived).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('SUCCESS');
  });

  it('should work with empty options', async () => {
    req.query = { qpay_payment_id: '493622150113502' };
    req.qpay.checkPayment.mockResolvedValue({
      rows: [{ payment_id: 'PAY_1' }],
    });

    const handler = qpayWebhook({});
    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('SUCCESS');
  });

  it('should handle checkPayment returning no rows property', async () => {
    req.query = { qpay_payment_id: '493622150113503' };
    req.qpay.checkPayment.mockResolvedValue({});

    const handler = qpayWebhook();
    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('SUCCESS');
  });
});
