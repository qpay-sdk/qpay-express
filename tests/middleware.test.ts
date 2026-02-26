import { qpayMiddleware } from '../src/middleware';

jest.mock('qpay-js', () => {
  const MockQPayClient = jest.fn().mockImplementation((config: any) => ({
    config,
    createInvoice: jest.fn(),
    createSimpleInvoice: jest.fn(),
    checkPayment: jest.fn(),
  }));

  return {
    QPayClient: MockQPayClient,
    loadConfigFromEnv: jest.fn().mockReturnValue({
      baseUrl: 'https://merchant.qpay.mn',
      username: 'env_user',
      password: 'env_pass',
      invoiceCode: 'INV_CODE',
    }),
  };
});

describe('qpayMiddleware', () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    // Reset module cache to clear singleton client between tests
    jest.resetModules();
    req = {};
    res = {};
    next = jest.fn();
  });

  it('should attach qpay client to request with explicit config', () => {
    const config = {
      baseUrl: 'https://merchant.qpay.mn',
      username: 'test_user',
      password: 'test_pass',
      invoiceCode: 'TEST_CODE',
    };

    const middleware = qpayMiddleware(config);
    middleware(req, res, next);

    expect(req.qpay).toBeDefined();
    expect(next).toHaveBeenCalled();
  });

  it('should call next() without errors', () => {
    const config = {
      baseUrl: 'https://merchant.qpay.mn',
      username: 'test_user',
      password: 'test_pass',
      invoiceCode: 'TEST_CODE',
    };

    const middleware = qpayMiddleware(config);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('should reuse the same client instance across requests', () => {
    const config = {
      baseUrl: 'https://merchant.qpay.mn',
      username: 'test_user',
      password: 'test_pass',
      invoiceCode: 'TEST_CODE',
    };

    const middleware = qpayMiddleware(config);

    const req1: any = {};
    const req2: any = {};

    middleware(req1, res, next);
    middleware(req2, res, next);

    expect(req1.qpay).toBe(req2.qpay);
  });

  it('should load config from environment when no config provided', async () => {
    // Re-import to get a fresh module with cleared singleton
    jest.isolateModules(() => {
      const { qpayMiddleware: freshMiddleware } = require('../src/middleware');
      const { loadConfigFromEnv } = require('qpay-js');

      const mw = freshMiddleware();
      mw(req, res, next);

      expect(loadConfigFromEnv).toHaveBeenCalled();
      expect(req.qpay).toBeDefined();
      expect(next).toHaveBeenCalled();
    });
  });

  it('should set qpay property on request object', () => {
    const config = {
      baseUrl: 'https://merchant.qpay.mn',
      username: 'u',
      password: 'p',
      invoiceCode: 'C',
    };

    const middleware = qpayMiddleware(config);
    middleware(req, res, next);

    expect(req).toHaveProperty('qpay');
    expect(typeof req.qpay).toBe('object');
  });
});
