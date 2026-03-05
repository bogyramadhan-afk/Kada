import crypto from 'node:crypto';

const isProduction = String(process.env.MIDTRANS_IS_PRODUCTION || 'false') === 'true';
const midtransBaseUrl = isProduction
  ? 'https://api.midtrans.com'
  : 'https://api.sandbox.midtrans.com';

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
    const serverKey = String(process.env.MIDTRANS_SERVER_KEY || '').trim();

    if (!serverKey) {
      return res.status(500).json({
        message: 'MIDTRANS_SERVER_KEY belum diset di Vercel Environment Variables.',
      });
    }
    const notification = typeof req.body === 'string'
      ? JSON.parse(req.body || '{}')
      : (req.body || {});

    if (!notification.order_id && !notification.transaction_status && !notification.signature_key) {
      return res.status(200).json({ message: 'Notification endpoint is reachable.' });
    }

    const orderId = notification.order_id || null;
    const statusCode = String(notification.status_code || '');
    const grossAmount = String(notification.gross_amount || '');
    const signatureKey = String(notification.signature_key || '');

    if (orderId && statusCode && grossAmount && signatureKey) {
      const expectedSignature = crypto
        .createHash('sha512')
        .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
        .digest('hex');

      if (expectedSignature !== signatureKey) {
        return res.status(401).json({ message: 'Signature Midtrans tidak valid.' });
      }
    }

    let statusResponse = notification;
    if (orderId) {
      const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;
      const midtransResponse = await fetch(
        `${midtransBaseUrl}/v2/${encodeURIComponent(orderId)}/status`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: authHeader,
          },
        }
      );

      const statusJson = await midtransResponse.json();
      if (midtransResponse.ok) {
        statusResponse = statusJson;
      }
    }

    const transactionStatus = statusResponse.transaction_status || notification.transaction_status || null;
    const fraudStatus = statusResponse.fraud_status || notification.fraud_status || null;
    const paymentType = statusResponse.payment_type || notification.payment_type || null;
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
