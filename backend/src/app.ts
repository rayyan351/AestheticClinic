import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import routes from './routes';
import { errorHandler } from './middlewares/error';

const app = express();
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());


app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', routes);
app.use(errorHandler);

export default app;
