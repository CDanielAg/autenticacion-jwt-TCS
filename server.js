import { readFile } from 'node:fs/promises';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';

const email = 'demo@example.com';
const password = process.env.DEMO_PASSWORD;
if (!password) {
  console.error('Define DEMO_PASSWORD antes de iniciar el servidor.');
  process.exit(1);
}

const secret = randomBytes(32);
const header = encode({ alg: 'HS256', typ: 'JWT' });
const lifetime = 900;

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(value) {
  return createHmac('sha256', secret).update(value).digest();
}

function issueToken() {
  const now = Math.floor(Date.now() / 1000);
  const payload = encode({ sub: email, iat: now, exp: now + lifetime });
  const value = header + '.' + payload;
  return value + '.' + sign(value).toString('base64url');
}

function authenticate(authorization) {
  const match = /^Bearer ([\w-]+)\.([\w-]+)\.([\w-]{43})$/i.exec(authorization ?? '');
  if (!match || match[1] !== header) return null;

  const [, tokenHeader, payload, signature] = match;
  const expected = sign(tokenHeader + '.' + payload).toString('base64url');
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (claims.sub === email && Number.isInteger(claims.exp) && claims.exp > Date.now() / 1000) {
      return claims.sub;
    }
  } catch {
    return null;
  }
  return null;
}

function reply(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  }).end(JSON.stringify(body, null, 2) + '\n');
}

async function login(request, response) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > 4096) {
      request.resume();
      return reply(response, 413, { error: 'Solicitud demasiado grande.' });
    }
    chunks.push(chunk);
  }
  let credentials;
  try {
    credentials = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return reply(response, 400, { error: 'Envía un cuerpo JSON válido.' });
  }
  const digest = (value) => createHash('sha256').update(value).digest();
  if (credentials?.email !== email || typeof credentials.password !== 'string'
      || !timingSafeEqual(digest(credentials.password), digest(password))) {
    return reply(response, 401, { error: 'Credenciales inválidas.' });
  }
  return reply(response, 200, { access_token: issueToken(), token_type: 'Bearer', expires_in: lifetime });
}

const assets = new Map([
  ['/', ['index.html', 'text/html']],
  ['/style.css', ['style.css', 'text/css']],
  ['/app.js', ['app.js', 'text/javascript']],
]);

createServer(async (request, response) => {
  try {
    const asset = assets.get(request.url);
    if (request.method === 'GET' && asset) {
      const [file, type] = asset;
      const content = await readFile(new URL('./web/' + file, import.meta.url));
      return response.writeHead(200, { 'Content-Type': type + '; charset=utf-8' }).end(content);
    }
    if (request.method === 'POST' && request.url === '/api/auth/login') {
      return await login(request, response);
    }
    if (request.method === 'GET' && request.url === '/api/profile') {
      const subject = authenticate(request.headers.authorization);
      if (subject) return reply(response, 200, { email: subject, message: 'Acceso autorizado.' });
      return reply(response, 401, { error: 'Se requiere un Bearer token válido.' }, {
        'WWW-Authenticate': 'Bearer',
      });
    }
    return reply(response, 404, { error: 'Ruta no encontrada.' });
  } catch {
    if (!response.destroyed) reply(response, 500, { error: 'Error interno.' });
  }
}).listen(4176, '127.0.0.1', () => console.log('API JWT disponible en http://127.0.0.1:4176'));
