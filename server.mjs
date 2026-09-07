import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const publicFiles = new Set(['index.html', 'styles.css', 'app.js', 'menu.js', 'favicon.svg']);
const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\//, '') || 'index.html';
    const path = resolve(root, pathname);
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep) || (!publicFiles.has(pathname) && !/^assets\/[a-z0-9-]+\.(webp|woff2)$/.test(pathname))) {
      response.writeHead(404).end('Not found');
      return;
    }
    const contents = await readFile(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : contents);
  } catch {
    response.writeHead(404).end('Not found');
  }
});
server.listen(3000, '127.0.0.1', () => console.log('Complimento: http://localhost:3000'));
