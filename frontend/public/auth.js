const authConfig = window.APP_CONFIG;
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const deleteButton = document.getElementById('delete-account-button');
const logoutButton = document.getElementById('logout-button');
const statusBox = document.getElementById('auth-status');
const sessionBox = document.getElementById('session-box');

function saveSession(data) {
  localStorage.setItem(authConfig.authStorageKey, data.token);
  localStorage.setItem(authConfig.userStorageKey, JSON.stringify(data.user));
  renderSession();
}

function clearSession() {
  localStorage.removeItem(authConfig.authStorageKey);
  localStorage.removeItem(authConfig.userStorageKey);
  renderSession();
}

function getUser() {
  const raw = localStorage.getItem(authConfig.userStorageKey);
  return raw ? JSON.parse(raw) : null;
}

function renderSession() {
  const user = getUser();
  sessionBox.textContent = user ? `Login sebagai ${user.name} (${user.email})` : 'Belum login.';
}

async function sendJson(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Request gagal.');
  }

  return data;
}

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  statusBox.textContent = 'Mendaftarkan user...';

  try {
    const data = await sendJson(`${authConfig.apiBaseUrl}/auth/register`, 'POST', {
      name: registerForm.name.value,
      email: registerForm.email.value,
      password: registerForm.password.value,
    });

    saveSession(data);
    registerForm.reset();
    statusBox.textContent = data.message;
  } catch (error) {
    statusBox.textContent = error.message;
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  statusBox.textContent = 'Mencoba login...';

  try {
    const data = await sendJson(`${authConfig.apiBaseUrl}/auth/login`, 'POST', {
      email: loginForm.email.value,
      password: loginForm.password.value,
    });

    saveSession(data);
    loginForm.reset();
    statusBox.textContent = data.message;
  } catch (error) {
    statusBox.textContent = error.message;
  }
});

logoutButton.addEventListener('click', () => {
  // Logout hanya menghapus token di browser sesuai tugas.
  clearSession();
  statusBox.textContent = 'Logout berhasil.';
});

deleteButton.addEventListener('click', async () => {
  const token = localStorage.getItem(authConfig.authStorageKey);

  if (!token) {
    statusBox.textContent = 'Login dulu sebelum menghapus akun.';
    return;
  }

  statusBox.textContent = 'Menghapus akun...';

  try {
    const response = await fetch(`${authConfig.apiBaseUrl}/auth/delete-account`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Gagal menghapus akun.');
    }

    clearSession();
    statusBox.textContent = data.message;
  } catch (error) {
    statusBox.textContent = error.message;
  }
});

renderSession();
