import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'three-kingdoms-dev-secret';
const router = Router();

function makeToken(id: number, username: string, isAdmin: boolean): string {
  return jwt.sign({ id, username, isAdmin }, JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: '用户名和密码不能为空' });
      return;
    }
    if (username.length < 2 || username.length > 50) {
      res.status(400).json({ error: '用户名长度需在2-50个字符之间' });
      return;
    }
    if (password.length < 3) {
      res.status(400).json({ error: '密码长度至少3个字符' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      'INSERT INTO players (username, password_hash) VALUES (?, ?)',
      [username, passwordHash]
    );

    const playerId = (result as any).insertId;
    const token = makeToken(playerId, username, false);

    res.status(201).json({
      token,
      player: { id: playerId, username, gold: 2000, isAdmin: false },
    });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: '用户名已存在' });
      return;
    }
    console.error('Register error:', err.message, err.code, err.sqlMessage);
    res.status(500).json({ error: '注册失败: ' + (err.sqlMessage || err.message) });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: '用户名和密码不能为空' });
      return;
    }

    const [rows] = await pool.execute(
      'SELECT id, username, password_hash, gold, is_admin FROM players WHERE username = ?',
      [username]
    );

    const players = rows as any[];
    if (players.length === 0) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const player = players[0];
    const valid = await bcrypt.compare(password, player.password_hash);
    if (!valid) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const token = makeToken(player.id, player.username, !!player.is_admin);

    res.json({
      token,
      player: {
        id: player.id,
        username: player.username,
        gold: player.gold,
        isAdmin: !!player.is_admin,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err.message, err.code);
    res.status(500).json({ error: '登录失败: ' + (err.sqlMessage || err.message) });
  }
});

export default router;
