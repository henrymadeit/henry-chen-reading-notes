/// <reference types="@cloudflare/workers-types" />
export async function adminToken(password: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`henryreads-admin:${password}`));
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

export async function isAdmin(request: Request, env: { ADMIN_PASSWORD: string }) {
  if (!env.ADMIN_PASSWORD) return false;
  const value = (request.headers.get('Cookie') ?? '').split(';').map(s => s.trim())
    .find(s => s.startsWith('henry_admin='))?.slice('henry_admin='.length);
  return !!value && value === await adminToken(env.ADMIN_PASSWORD);
}

export function privateJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store, private', Vary: 'Cookie' } });
}
