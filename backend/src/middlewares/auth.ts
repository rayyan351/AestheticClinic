import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthUser {
  sub: string;
  role: 'patient' | 'doctor' | 'admin';
  name: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export function requireAuth(roles?: AuthUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
      if (roles && !roles.includes(payload.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      req.user = payload;
      next();
    } catch {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}
