/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export async function onRequest(): Promise<Response> {
  return new Response(
    JSON.stringify({
      status: 'ok',
      runtime: 'cloudflare-pages',
      time: Date.now(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    }
  );
}
