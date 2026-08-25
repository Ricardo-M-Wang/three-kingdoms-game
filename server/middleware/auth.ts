import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'three-kingdoms-dev-secret';

export interface AuthPlayer {
  id: number;
  username: string;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      player?: AuthPlayer;
    }
  }
}

export function authRequired(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: '未登录，请先登录' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPlayer;
    req.player = payload;
    next();
  } catch {
    res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

export async function adminOnly(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.player) {
    res.status(401).json({ error: '未登录' });
    return;
  }
  try {
    const [rows] = await pool.execute(
      'SELECT is_admin FROM players WHERE id = ?',
      [req.player.id]
    );
    const player = (rows as any[])[0];
    if (!player || !player.is_admin) {
      res.status(403).json({ error: '需要管理员权限' });
      return;
    }
    req.player.isAdmin = true;
    next();
  } catch (err) {
    console.error('Admin check error:', err);
    res.status(500).json({ error: '权限校验失败' });
  }
}
