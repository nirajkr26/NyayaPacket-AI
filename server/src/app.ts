import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth';
import guardDemoRouter from './routes/guardDemo';

export function createApp(): Application {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS for frontend origin
  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  app.use(
    cors({
      origin: clientOrigin,
      credentials: true,
    })
  );

  // Parsers
  app.use(express.json());
  app.use(cookieParser());

  // Rate limiting for auth routes (relaxed in tests to prevent flaky runs)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'test' ? 1000 : 20,
    message: { message: 'Too many authentication attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
  });

  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  // Mount API Routers
  app.use('/api/auth', authRouter);
  app.use('/api', guardDemoRouter);

  // Health check route
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'nyayapacket-ai-backend' });
  });

  // Global 404 handler for API routes
  app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ message: 'API endpoint not found' });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({
      message: 'An internal server error occurred.',
      ...(process.env.NODE_ENV === 'development' ? { error: err.message } : {}),
    });
  });

  return app;
}

export default createApp;
