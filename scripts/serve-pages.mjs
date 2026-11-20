import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../out/', import.meta.url));
const { base_path: base } = JSON.parse(await readFile(resolve(out, 'site-config.json'), 'utf8'));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.geojson': 'application/geo+json',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
    try {
        const url = new URL(req.url, 'http://localhost');
        if (base && url.pathname === base) { res.writeHead(308, { Location: `${base}/${url.search}` }).end(); return; }
        if (base && !url.pathname.startsWith(`${base}/`)) { res.writeHead(404).end(); return; }
        let file = resolve(out, `.${decodeURIComponent(url.pathname.slice(base.length))}`);
        if (file !== resolve(out) && !file.startsWith(resolve(out) + '/')) { res.writeHead(404).end(); return; }
        if ((await stat(file)).isDirectory()) {
            if (!url.pathname.endsWith('/')) { res.writeHead(308, { Location: `${url.pathname}/${url.search}` }).end(); return; }
            file = resolve(file, 'index.html');
        }
        const contents = await readFile(file);
        res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
        res.end(contents);
    } catch { res.writeHead(404).end('Not found'); }
});
server.listen(Number(process.env.PORT || 4173), process.env.HOST || '127.0.0.1', () => console.log(`Static preview ready on port ${server.address().port}, base path ${base || '/'}.`));
