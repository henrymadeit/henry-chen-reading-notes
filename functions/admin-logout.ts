/// <reference types="@cloudflare/workers-types" />

interface Env {}

export const onRequestPost: PagesFunction<Env> = async () => {
  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie':
          'henry_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
      }
    }
  );
};