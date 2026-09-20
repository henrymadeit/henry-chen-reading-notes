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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as {
      password?: string;
    };

    const password = body.password ?? '';

    if (!password || password !== context.env.ADMIN_PASSWORD) {
      return Response.json(
        { error: '密碼錯誤' },
        { status: 401 }
      );
    }

    const token = await makeAdminToken(context.env.ADMIN_PASSWORD);

    return Response.json(
      { success: true },
      {
        headers: {
          'Set-Cookie':
            `henry_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict`
        }
      }
    );

  } catch {
    return Response.json(
      { error: '登入失敗' },
      { status: 500 }
    );
  }
};

