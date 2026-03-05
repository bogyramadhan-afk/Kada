window.APP_CONFIG = {
  // Default ini dipakai saat frontend belum sempat mengambil config dari server.
  apiBaseUrl: 'http://localhost:3000',
  authStorageKey: 'kada-token',
  userStorageKey: 'kada-user',
  proxyStorageKey: 'kada-proxy-target',
  proxies: [
    { key: 'local', label: 'Local', url: 'http://localhost:3000/notes' },
    { key: 'vercel', label: 'Vercel', url: 'https://kada-six.vercel.app/notes' },
    { key: 'custom', label: 'lenkada.my.id', url: 'https://www.lenkada.my.id/notes' },
  ],
};
