interface Env {
  ADMIN_PASSWORD: string;
}

async function makeAdminToken(password: string) {
  const data = new TextEncoder().encode(`henryreads-admin:${password}`);
  const hash = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const cookie = context.request.headers.get('Cookie') ?? '';

    const adminCookie = cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('henry_admin='));

    if (!adminCookie) {
      return Response.json({ admin: false });
    }

    const token = adminCookie.substring('henry_admin='.length);
    const expectedToken = await makeAdminToken(context.env.ADMIN_PASSWORD);

    return Response.json({
      admin: token === expectedToken
    });

  } catch {
    return Response.json({
      admin: false
    });
  }
};