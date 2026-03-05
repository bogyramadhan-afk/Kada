const appConfig = window.APP_CONFIG;
const proxySelect = document.getElementById('proxy-select');
const statusText = document.getElementById('status-text');
const messageList = document.getElementById('message-list');
const messageForm = document.getElementById('message-form');
const userInfo = document.getElementById('user-info');

function getToken() {
  return localStorage.getItem(appConfig.authStorageKey);
}

function getUser() {
  const raw = localStorage.getItem(appConfig.userStorageKey);
  return raw ? JSON.parse(raw) : null;
}

function updateUserInfo() {
  const user = getUser();
  userInfo.textContent = user ? `Login: ${user.name}` : 'Belum login. Buka halaman auth.';
}

function saveProxyTarget(value) {
  localStorage.setItem(appConfig.proxyStorageKey, value);
}

function getProxyTarget() {
  return localStorage.getItem(appConfig.proxyStorageKey) || 'local';
}

function useProxy() {
  return getProxyTarget() !== 'local';
}

function createMessageUrl(id = '') {
  const target = getProxyTarget();

  if (useProxy()) {
    const base = id ? `/api/proxy/messages/${id}` : '/api/proxy/messages';
    return `${base}?target=${encodeURIComponent(target)}`;
  }

  const base = `${appConfig.apiBaseUrl}/messages`;
  return id ? `${base}/${id}` : base;
}

function buildHeaders(withJson = false) {
  const headers = {};
  const token = getToken();

  if (withJson) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function loadServerConfig() {
  const response = await fetch('/api/config');
  const data = await response.json();
  appConfig.apiBaseUrl = data.apiBaseUrl;
  appConfig.proxies = data.proxies;
}

function renderProxyOptions() {
  proxySelect.innerHTML = appConfig.proxies
    .map((item) => `<option value="${item.key}">${item.label}</option>`)
    .join('');

  proxySelect.value = getProxyTarget();
}

function renderMessages(messages) {
  if (!messages.length) {
    messageList.innerHTML = '<li>Tidak ada pesan.</li>';
    return;
  }

  messageList.innerHTML = messages
    .map(
      (message) => `
        <li class="card">
          <strong>${message.authorName}</strong>
          <p>${message.text}</p>
          <small>${new Date(message.createdAt).toLocaleString()}</small>
          <div class="row">
            <button data-delete="${message._id}">Delete</button>
            <button data-email="${message._id}">Email Copy</button>
          </div>
        </li>
      `
    )
    .join('');
}

async function requestMessages() {
  const response = await fetch(createMessageUrl(), {
    headers: buildHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Gagal mengambil pesan.');
  }

  return data;
}

async function createMessage(text) {
  const response = await fetch(createMessageUrl(), {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify({ text }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Gagal mengirim pesan.');
  }
}

async function deleteMessage(id) {
  const response = await fetch(createMessageUrl(id), {
    method: 'DELETE',
    headers: buildHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Gagal menghapus pesan.');
  }
}

async function sendEmailCopy(id) {
  if (useProxy()) {
    throw new Error('Email copy hanya tersedia saat memakai server local.');
  }

  const to = window.prompt('Masukkan email tujuan:');
  if (!to) {
    return;
  }

  const response = await fetch(`${appConfig.apiBaseUrl}/messages/${id}/email`, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify({ to }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Gagal mengirim email.');
  }

  statusText.textContent = data.message;
}

async function refreshMessages() {
  statusText.textContent = 'Memuat pesan...';

  try {
    const messages = await requestMessages();
    renderMessages(messages);
    statusText.textContent = 'Pesan berhasil dimuat.';
  } catch (error) {
    messageList.innerHTML = '';
    statusText.textContent = error.message;
  }
}

messageForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await createMessage(messageForm.text.value.trim());
    messageForm.reset();
    statusText.textContent = 'Pesan berhasil dikirim.';
    await refreshMessages();
  } catch (error) {
    statusText.textContent = error.message;
  }
});

messageList.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  try {
    if (target.dataset.delete) {
      await deleteMessage(target.dataset.delete);
      statusText.textContent = 'Pesan berhasil dihapus.';
      await refreshMessages();
    }

    if (target.dataset.email) {
      await sendEmailCopy(target.dataset.email);
    }
  } catch (error) {
    statusText.textContent = error.message;
  }
});

proxySelect.addEventListener('change', async () => {
  saveProxyTarget(proxySelect.value);
  await refreshMessages();
});

async function startPage() {
  await loadServerConfig();
  renderProxyOptions();
  updateUserInfo();
  await refreshMessages();
}

startPage();
