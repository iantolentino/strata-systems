import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import checkStatus from './api/check-status.js';
import report from './api/report.js';
import badge from './api/badge.js';

function localApi() {
  return { name: 'local-api', configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if (!request.url.startsWith('/api/')) return next();
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const rawBody = Buffer.concat(chunks).toString();
      request.body = rawBody ? JSON.parse(rawBody) : undefined;
      request.query = Object.fromEntries(new URL(request.url, 'http://localhost').searchParams);
      const handler = request.url.startsWith('/api/report') ? report : request.url.startsWith('/api/badge') ? badge : checkStatus;
      const apiResponse = { status(code) { response.statusCode = code; return apiResponse; }, json(payload) { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(payload)); }, send(payload) { response.end(payload); } };
      try { await handler(request, apiResponse); } catch (error) { response.statusCode = 500; response.end(JSON.stringify({ error: error.message })); }
    });
  } };
}

export default defineConfig({ plugins: [react(), localApi()] });
