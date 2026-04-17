// src/utils/avatar.js
// Proxies Google profile photos through wsrv.nl to avoid CORS/blocking issues
export function avatarUrl(photoURL, displayName = 'U', size = 64) {
  if (photoURL) {
    return `https://wsrv.nl/?url=${encodeURIComponent(photoURL)}&w=${size}&h=${size}`
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0d1220&color=00e5ff&size=${size}`
}
