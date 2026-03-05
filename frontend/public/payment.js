const appConfig = window.APP_CONFIG;
const paymentForm = document.getElementById('payment-form');
const payButton = document.getElementById('pay-button');
const checkButton = document.getElementById('check-button');
const paymentStatus = document.getElementById('payment-status');
const orderIdText = document.getElementById('order-id-text');
const orderIdInput = document.getElementById('order-id-input');
let snapReady = false;

async function loadServerConfig() {
  const response = await fetch('/api/config');
  const data = await response.json();
  appConfig.apiBaseUrl = data.apiBaseUrl;
  appConfig.midtransClientKey = data.midtransClientKey || '';
}

function loadSnapScript() {
  if (window.snap) {
    snapReady = true;
    return Promise.resolve();
  }

  if (!appConfig.midtransClientKey) {
    return Promise.reject(new Error('Payment system not configured. Please contact administrator.'));
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.dataset.clientKey = appConfig.midtransClientKey;
    script.onload = () => {
      snapReady = true;
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Gagal memuat Snap Midtrans.'));
    };
    document.body.appendChild(script);
  });
}

function getStoredOrderId() {
  return localStorage.getItem('kada-midtrans-order-id') || '';
}

function saveOrderId(orderId) {
  if (!orderId) {
    return;
  }

  localStorage.setItem('kada-midtrans-order-id', orderId);
  if (orderIdInput) {
    orderIdInput.value = orderId;
  }
}

function setStatus(message, orderId = '') {
  paymentStatus.textContent = message;
  orderIdText.textContent = orderId ? `Order ID: ${orderId}` : '';
}

async function createPayment(amount, name, email) {
  const response = await fetch(`${appConfig.apiBaseUrl}/payment/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Number(amount),
      first_name: name,
      email,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Gagal membuat transaksi.');
  }

  return data;
}

async function requestPaymentStatus(orderId) {
  const response = await fetch(`${appConfig.apiBaseUrl}/api/midtrans/status/${encodeURIComponent(orderId)}`);
  const data = await response.json();

  if (!response.ok) {
    const detailMessage =
      data?.midtrans_response?.status_message ||
      data?.midtrans_response?.status_code ||
      data?.error ||
      '';
    const finalMessage = detailMessage
      ? `${data.message || 'Gagal mengambil status pembayaran.'} (${detailMessage})`
      : (data.message || 'Gagal mengambil status pembayaran.');
    throw new Error(finalMessage);
  }

  return data;
}

function mapMidtransStatus(data) {
  const status = String(data.transaction_status || '').toLowerCase();
  const fraudStatus = String(data.fraud_status || '').toLowerCase();

  if (status === 'settlement' || (status === 'capture' && fraudStatus !== 'challenge')) {
    return {
      label: 'Payment success',
      detail: 'Pembayaran berhasil dikonfirmasi.',
    };
  }

  if (status === 'pending' || (status === 'capture' && fraudStatus === 'challenge')) {
    return {
      label: 'Waiting for payment',
      detail: 'Pembayaran masih menunggu penyelesaian.',
    };
  }

  if (['deny', 'cancel', 'expire', 'failure'].includes(status)) {
    return {
      label: 'Payment failed',
      detail: 'Pembayaran gagal atau dibatalkan.',
    };
  }

  return {
    label: 'Waiting for payment',
    detail: `Status saat ini: ${status || 'unknown'}`,
  };
}

async function checkPaymentStatus() {
  const typedOrderId = String(orderIdInput?.value || '').trim();
  const orderId = typedOrderId || getStoredOrderId();

  if (!orderId) {
    setStatus('No order ID found. Please make a payment first.');
    return;
  }

  checkButton.disabled = true;
  setStatus('Checking payment status...', orderId);

  try {
    const data = await requestPaymentStatus(orderId);
    const mapped = mapMidtransStatus(data);
    const details = [];

    if (data.payment_type) {
      details.push(`payment_type: ${data.payment_type}`);
    }

    if (data.gross_amount) {
      details.push(`gross_amount: ${data.gross_amount}`);
    }

    const suffix = details.length ? ` (${details.join(', ')})` : '';
    saveOrderId(data.order_id || orderId);
    setStatus(`${mapped.label} ${mapped.detail}${suffix}`, data.order_id || orderId);
  } catch (error) {
    setStatus(error.message, orderId);
  } finally {
    checkButton.disabled = false;
  }
}

function openSnapPayment(token, orderId) {
  if (!snapReady || !window.snap) {
    setStatus('Payment system is not ready.', orderId);
    return;
  }

  window.snap.pay(token, {
    onSuccess(result) {
      const callbackOrderId = result?.order_id || orderId;
      saveOrderId(callbackOrderId);
      setStatus('Payment success', callbackOrderId);
    },
    onPending(result) {
      const callbackOrderId = result?.order_id || orderId;
      saveOrderId(callbackOrderId);
      setStatus('Waiting for payment', callbackOrderId);
    },
    onError(result) {
      const callbackOrderId = result?.order_id || orderId;
      saveOrderId(callbackOrderId);
      setStatus('Payment failed', callbackOrderId);
    },
    onClose() {
      saveOrderId(orderId);
      setStatus('Payment window closed. You can check the payment status.', orderId);
    },
  });
}

paymentForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const amount = paymentForm.amount.value.trim();
  const name = paymentForm.name.value.trim();
  const email = paymentForm.email.value.trim();

  if (!amount || !name || !email) {
    setStatus('All fields are required.');
    return;
  }

  payButton.disabled = true;
  setStatus('Creating transaction...');

  try {
    const transaction = await createPayment(amount, name, email);
    saveOrderId(transaction.order_id);
    setStatus('Transaction created successfully. Opening Midtrans...', transaction.order_id);
    openSnapPayment(transaction.token, transaction.order_id);
  } catch (error) {
    setStatus(error.message);
  } finally {
    payButton.disabled = false;
  }
});

checkButton.addEventListener('click', checkPaymentStatus);

const savedOrderId = getStoredOrderId();
if (savedOrderId) {
  if (orderIdInput) {
    orderIdInput.value = savedOrderId;
  }
  setStatus('Last order found. Click the button to check payment status.', savedOrderId);
}

Promise.resolve()
  .then(loadServerConfig)
  .then(loadSnapScript)
  .catch((error) => {
    setStatus(error.message);
  });
