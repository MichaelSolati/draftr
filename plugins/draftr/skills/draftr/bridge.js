#!/usr/bin/env node

import http from 'node:http';
import net from 'node:net';
import {exec} from 'node:child_process';

const DEFAULT_PORT = 4318;
const MAX_ATTEMPTS = 50;
const DRAFTR_URL = 'https://michaelsolati.github.io/draftr/';

function findAvailablePort(start) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    function tryPort(port) {
      if (attempts >= MAX_ATTEMPTS) {
        reject(
          new Error(
            `No available port found in range ${start}–${start + MAX_ATTEMPTS - 1}`
          )
        );
        return;
      }
      attempts++;

      const probe = net.createServer();
      probe.once('error', () => tryPort(port + 1));
      probe.once('listening', () => probe.close(() => resolve(port)));
      probe.listen(port, '127.0.0.1');
    }

    tryPort(start);
  });
}

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin'
      ? `open "${url}"`
      : process.platform === 'win32'
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;

  exec(cmd, err => {
    if (err) {
      process.stderr.write(`Warning: could not open browser: ${err.message}\n`);
    }
  });
}

const port = await findAvailablePort(DEFAULT_PORT);
const isDynamic = port !== DEFAULT_PORT;
const url = isDynamic ? `${DRAFTR_URL}?port=${port}` : DRAFTR_URL;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/claude/handoff') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(
        JSON.stringify({success: true, message: 'Specification received'})
      );
      process.stdout.write(body + '\n');
      setTimeout(() => process.exit(0), 200);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(port, '127.0.0.1', () => {
  process.stderr.write(`Draftr bridge listening on http://127.0.0.1:${port}\n`);
  process.stderr.write(`Opening: ${url}\n`);
  process.stderr.write('Waiting for specification from Draftr UI...\n');
  openBrowser(url);
});
