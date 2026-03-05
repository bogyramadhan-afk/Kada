import midtransClient from 'midtrans-client';

const isProduction = String(process.env.MIDTRANS_IS_PRODUCTION || 'false') === 'true';

const coreApi = new midtransClient.CoreApi({
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

function mapPaymentState(transactionStatus, fraudStatus) {
  if (
    transactionStatus === 'settlement' ||
    (transactionStatus === 'capture' && fraudStatus !== 'challenge')
  ) {
    return 'success';
  }

  if (
    transactionStatus === 'pending' ||
    (transactionStatus === 'capture' && fraudStatus === 'challenge')
  ) {
    return 'waiting';
  }

  if (['deny', 'cancel', 'expire', 'failure'].includes(transactionStatus)) {
    return 'failed';
  }

  return 'waiting';
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ message: 'Notification endpoint is reachable.' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ message: 'Method not allowed.' });
  }

  try {
    const notification = req.body || {};

    if (!notification.order_id && !notification.transaction_status && !notification.signature_key) {
      return res.status(200).json({ message: 'Notification endpoint is reachable.' });
    }

    const statusResponse = await coreApi.transaction.notification(notification);
    const orderId = statusResponse.order_id || notification.order_id || null;
    const transactionStatus = statusResponse.transaction_status || null;
    const fraudStatus = statusResponse.fraud_status || null;
    const paymentType = statusResponse.payment_type || null;
    const paymentState = mapPaymentState(transactionStatus, fraudStatus);

    console.log('[Midtrans Notification][Vercel]', {
      order_id: orderId,
      transaction_status: transactionStatus,
      fraud_status: fraudStatus,
      payment_type: paymentType,
      payment_state: paymentState,
    });

    return res.status(200).json({
      message: 'Notifikasi Midtrans diterima',
      order_id: orderId,
      transaction_status: transactionStatus,
      fraud_status: fraudStatus,
      payment_type: paymentType,
      payment_state: paymentState,
    });
  } catch (error) {
    console.error('[Midtrans Notification][Vercel] Error:', error);
    return res.status(200).json({
      message: 'Notifikasi diterima tetapi tidak bisa diverifikasi penuh.',
      error: error.message,
    });
  }
}
