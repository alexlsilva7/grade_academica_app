import express from 'express';
import path from 'node:path';
import app from './app';

const PORT = Number(process.env.PORT || 3000);

async function bootstrap() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FULL-STACK] Express server listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch(error => {
  console.error('Failed to kickstart server:', error);
});
