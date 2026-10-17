let authorization: Promise<boolean> | undefined;
export function ensureAdmin() {
  return authorization ??= (async () => {
    try {
      const response = await fetch('/api/admin-status', {cache:'no-store'});
      const data = await response.json();
      if (data.admin) {
        document.querySelector<HTMLElement>('[data-admin-content]')?.removeAttribute('hidden');
        return true;
      }
      location.replace('/admin');
    } catch {
      const status = document.querySelector<HTMLElement>('[data-admin-status]');
      if (status) status.textContent = '無法確認登入狀態，請重新整理。';
    }
    return false;
  })();
}
export async function adminFetch(url: string, options?: RequestInit) {
  const response = await fetch(url, {cache:'no-store', ...options});
  const data = await response.json();
  if (response.status === 401) { location.replace('/admin'); throw new Error('請重新登入'); }
  if (!response.ok) throw new Error(data.error || '無法讀取資料');
  return data;
}
export function localTime(value: string) {
  return new Date(value.includes('T') ? value : value.replace(' ','T')+'Z').toLocaleString('zh-TW', {timeZone:'Asia/Taipei', hour12:false});
}
export function articleLink(slug: string) {
  return `/articles/${slug.split('/').map(encodeURIComponent).join('/')}/`;
}
