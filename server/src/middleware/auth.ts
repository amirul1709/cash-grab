import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: number; email: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const token: string | undefined = req.cookies?.access_token;
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }
  try {
    // Pin the algorithm so a token forged with a different `alg` header
    // (e.g. an algorithm-confusion attempt) can't be accepted.
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!, {
      algorithms: ['HS256'],
    }) as {
      id: number;
      email: string;
    };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
