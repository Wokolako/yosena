import './loadEnv';
import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';

export function createServer() {
  const app = express();

  // Standard middleware
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Attaches the Clerk session to every request. It does not reject anything on
  // its own — route-level authenticateToken decides what requires a session.
  app.use(clerkMiddleware());

  // Basic request logger
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    });
    next();
  });

  // Mount API router
  app.use('/api', apiRouter);
  app.use('/', apiRouter); // Also serve directly on root for convenience

  // Error handling middleware
  app.use(errorHandler);

  return app;
}

// Standalone runner
if (process.argv[1] && process.argv[1].includes('server')) {
  const PORT = process.env.BACKEND_PORT || 3001;
  const app = createServer();
  app.listen(PORT, () => {
    console.log(`[YosenaMora Backend] Server running on port ${PORT}`);
  });
}

export default createServer;
