# @qpay-sdk/express

QPay V2 payment middleware for Express.

## Install

```bash
npm install @qpay-sdk/express qpay-js
```

## Usage

### Middleware

```typescript
import express from 'express';
import { qpayMiddleware } from '@qpay-sdk/express';

const app = express();
app.use(qpayMiddleware());

app.post('/pay', async (req, res) => {
  const invoice = await req.qpay.createSimpleInvoice({
    invoiceCode: 'YOUR_CODE',
    senderInvoiceNo: 'ORDER-001',
    amount: 10000,
    callbackUrl: 'https://yoursite.com/qpay/webhook',
  });
  res.json(invoice);
});
```

### Pre-built Router

```typescript
import { createQPayRouter } from '@qpay-sdk/express';

app.use('/qpay', createQPayRouter(undefined, {
  onPaymentReceived: (invoiceId, result) => {
    console.log('Payment received:', invoiceId);
  },
}));
```

## License

MIT
