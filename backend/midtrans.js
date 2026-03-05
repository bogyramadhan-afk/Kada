import midtransClient from 'midtrans-client';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = String(process.env.MIDTRANS_IS_PRODUCTION || 'false') === 'true';

const snap = new midtransClient.Snap({
    isProduction,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

const coreApi = new midtransClient.CoreApi({
    isProduction,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

export const createTransaction = async (req, res) => {
  try {
    const { amount, first_name, email } = req.body;

    if (!amount || !first_name || !email) {
      return res.status(400).json({ message: 'Amount, name, dan email wajib diisi.' });
    }

    const parameter = {
      transaction_details: {
        order_id: "ORDER-" + Date.now(),
        gross_amount: Number(amount)
      },

      credit_card: {
        secure: true
      },

      customer_details: {
        first_name,
        email
      }
    };

const transaction = await snap.createTransaction(parameter);

res.status(200).json({
  message: "Transaksi berhasil dibuat",
  order_id: parameter.transaction_details.order_id,
  token: transaction.token,
  redirect_url: transaction.redirect_url
});

} catch (error) {
  console.error("Error createTransaction:", error);
  res.status(500).json({ message: "Gagal membuat transaksi" });
}
};

export const handleNotification = async (req, res) => {
  try {
    const notification = req.body || {};

    // Midtrans dashboard "Test notification URL" can send a minimal payload.
    // Return 200 so the endpoint is considered reachable.
    if (!notification.order_id && !notification.transaction_status && !notification.signature_key) {
      return res.status(200).json({
        message: 'Notification endpoint is reachable.',
      });
    }

    const statusResponse = await coreApi.transaction.notification(notification);
    const orderId = statusResponse.order_id || notification.order_id || null;
    const transactionStatus = statusResponse.transaction_status || null;
    const fraudStatus = statusResponse.fraud_status || null;
    const paymentType = statusResponse.payment_type || null;

    let paymentState = 'waiting';

    if (
      transactionStatus === 'settlement' ||
      (transactionStatus === 'capture' && fraudStatus !== 'challenge')
    ) {
      paymentState = 'success';
    } else if (
      transactionStatus === 'pending' ||
      (transactionStatus === 'capture' && fraudStatus === 'challenge')
    ) {
      paymentState = 'waiting';
    } else if (['deny', 'cancel', 'expire', 'failure'].includes(transactionStatus)) {
      paymentState = 'failed';
    }

    console.log('[Midtrans Notification]', {
      order_id: orderId,
      transaction_status: transactionStatus,
      fraud_status: fraudStatus,
      payment_type: paymentType,
      payment_state: paymentState,
    });

    // TODO: update status pembayaran di database berdasarkan orderId dan paymentState.
    if (!orderId) {
      return res.status(400).json({
        message: 'Notifikasi Midtrans tidak memiliki order_id.',
      });
    }

    return res.status(200).json({
      message: "Notifikasi Midtrans diterima",
      order_id: orderId,
      transaction_status: transactionStatus,
      fraud_status: fraudStatus,
      payment_type: paymentType,
      payment_state: paymentState,
    });
  } catch (error) {
    console.error("Error handleNotification:", error);
    // Return 200 to prevent repeated retries for malformed test payloads.
    return res.status(200).json({
      message: "Notifikasi diterima tetapi tidak bisa diverifikasi penuh.",
      error: error.message,
    });
  }
};

export const checkStatus = async (req, res) => {
  try {
    const orderId = String(req.params.orderId || req.params.order_id || '').trim();

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID wajib diisi.' });
    }

    if (!process.env.MIDTRANS_SERVER_KEY) {
      return res.status(500).json({
        message: 'MIDTRANS_SERVER_KEY belum dikonfigurasi di backend.'
      });
    }

    const midtransBaseUrl = isProduction
      ? 'https://api.midtrans.com'
      : 'https://api.sandbox.midtrans.com';
    const authHeader = `Basic ${Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString('base64')}`;

    const response = await fetch(`${midtransBaseUrl}/v2/${encodeURIComponent(orderId)}/status`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: authHeader,
      },
    });

    const bodyText = await response.text();
    let bodyJson = {};

    if (bodyText) {
      try {
        bodyJson = JSON.parse(bodyText);
      } catch {
        bodyJson = { raw: bodyText };
      }
    }

    if (!response.ok) {
      return res.status(response.status).json({
        message: 'Gagal mengambil status transaksi dari Midtrans.',
        midtrans_status: response.status,
        midtrans_response: bodyJson,
      });
    }

    return res.status(200).json(bodyJson);
  } catch (error) {
    console.error('Error checkStatus:', error);
    return res.status(500).json({
      message: 'Terjadi kesalahan saat mengambil status transaksi.',
      error: error.message,
    });
  }
};
