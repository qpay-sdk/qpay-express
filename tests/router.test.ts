import { createQPayRouter } from '../src/router';
import express from 'express';
import request from 'supertest';

jest.mock('qpay-js', () => {
  const MockQPayClient = jest.fn().mockImplementation(() => ({
    createSimpleInvoice: jest.fn(),
    checkPayment: jest.fn(),
  }));

  return {
    QPayClient: MockQPayClient,
    loadConfigFromEnv: jest.fn().mockReturnValue({
      baseUrl: 'https://merchant.qpay.mn',
      username: 'test',
      password: 'test',
      invoiceCode: 'TEST',
    }),
  };
});

describe('createQPayRouter', () => {
  let app: express.Application;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset module cache to clear singleton
    jest.resetModules();

    const { QPayClient } = require('qpay-js');
    mockClient = {
      createSimpleInvoice: jest.fn(),
      checkPayment: jest.fn(),
    };
    QPayClient.mockImplementation(() => mockClient);

    const { createQPayRouter: freshRouter } = require('../src/router');

    app = express();
    const config = {
      baseUrl: 'https://merchant.qpay.mn',
      username: 'test',
      password: 'test',
      invoiceCode: 'TEST',
    };
    app.use('/qpay', freshRouter(config));
  });

  describe('POST /qpay/invoice', () => {
    it('should create an invoice successfully', async () => {
      const invoiceData = {
        invoice_code: 'TEST',
        sender_invoice_no: 'ORD-001',
        amount: 1000,
        invoice_description: 'Test order',
      };

      const expectedResponse = {
        invoice_id: 'INV_001',
        qr_text: 'qr_data',
        qr_image: 'base64_image',
        urls: [],
      };

      mockClient.createSimpleInvoice.mockResolvedValue(expectedResponse);

      const res = await request(app)
        .post('/qpay/invoice')
        .send(invoiceData)
        .expect(200);

      expect(res.body).toEqual(expectedResponse);
      expect(mockClient.createSimpleInvoice).toHaveBeenCalledWith(invoiceData);
    });

    it('should return 500 on invoice creation error', async () => {
      mockClient.createSimpleInvoice.mockRejectedValue(
        new Error('Authentication failed')
      );

      const res = await request(app)
        .post('/qpay/invoice')
        .send({ amount: 1000 })
        .expect(500);

      expect(res.body).toEqual({ error: 'Authentication failed' });
    });
  });

  describe('POST /qpay/check', () => {
    it('should check payment successfully', async () => {
      const checkData = {
        objectType: 'INVOICE',
        objectId: 'INV_001',
      };

      const expectedResult = {
        rows: [{ payment_id: 'PAY_1', amount: 1000 }],
      };

      mockClient.checkPayment.mockResolvedValue(expectedResult);

      const res = await request(app)
        .post('/qpay/check')
        .send(checkData)
        .expect(200);

      expect(res.body).toEqual(expectedResult);
      expect(mockClient.checkPayment).toHaveBeenCalledWith(checkData);
    });

    it('should return 500 on payment check error', async () => {
      mockClient.checkPayment.mockRejectedValue(new Error('Network error'));

      const res = await request(app)
        .post('/qpay/check')
        .send({ objectType: 'INVOICE', objectId: 'INV_ERR' })
        .expect(500);

      expect(res.body).toEqual({ error: 'Network error' });
    });
  });

  describe('GET /qpay/webhook', () => {
    it('should return 400 if qpay_payment_id is missing', async () => {
      const res = await request(app)
        .get('/qpay/webhook')
        .expect(400);

      expect(res.text).toBe('Missing qpay_payment_id');
    });

    it('should process webhook with valid qpay_payment_id', async () => {
      mockClient.checkPayment.mockResolvedValue({
        rows: [{ payment_id: 'PAY_1' }],
      });

      const res = await request(app)
        .get('/qpay/webhook?qpay_payment_id=493622150113497')
        .expect(200);

      expect(res.text).toBe('SUCCESS');
    });

    it('should return SUCCESS even when no payments', async () => {
      mockClient.checkPayment.mockResolvedValue({ rows: [] });

      const res = await request(app)
        .get('/qpay/webhook?qpay_payment_id=493622150113498')
        .expect(200);

      expect(res.text).toBe('SUCCESS');
    });

    it('should return 500 on webhook processing error', async () => {
      mockClient.checkPayment.mockRejectedValue(new Error('Server error'));

      const res = await request(app)
        .get('/qpay/webhook?qpay_payment_id=493622150113499')
        .expect(500);

      expect(res.text).toBe('FAILED');
    });
  });

  describe('router with webhook options', () => {
    it('should pass webhook options to webhook handler', async () => {
      jest.resetModules();

      const { QPayClient } = require('qpay-js');
      const client = {
        createSimpleInvoice: jest.fn(),
        checkPayment: jest.fn().mockResolvedValue({
          rows: [{ payment_id: 'PAY_1' }],
        }),
      };
      QPayClient.mockImplementation(() => client);

      const { createQPayRouter: freshRouter } = require('../src/router');

      const onPaymentReceived = jest.fn();
      const testApp = express();
      const config = {
        baseUrl: 'https://merchant.qpay.mn',
        username: 'test',
        password: 'test',
        invoiceCode: 'TEST',
      };
      testApp.use('/qpay', freshRouter(config, { onPaymentReceived }));

      await request(testApp)
        .get('/qpay/webhook?qpay_payment_id=493622150113497')
        .expect(200);

      expect(onPaymentReceived).toHaveBeenCalledWith('493622150113497', {
        rows: [{ payment_id: 'PAY_1' }],
      });
    });
  });
});
