import { Router, Request, Response } from 'express';
import pool from '../db';
import { authRequired, adminOnly } from '../middleware/auth';

const router = Router();
router.use(authRequired);
router.use(adminOnly);

// GET /api/admin/players
router.get('/players', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, gold, is_admin, created_at FROM players ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    console.error('Admin list players error:', err);
    res.status(500).json({ error: '获取玩家列表失败' });
  }
});

// GET /api/admin/player/:id
router.get('/player/:id', async (req: Request, res: Response) => {
  try {
    const playerId = parseInt(req.params.id as string);
    if (isNaN(playerId)) {
      res.status(400).json({ error: '无效的玩家ID' });
      return;
    }

    const [pRows] = await pool.execute(
      'SELECT id, username, gold, is_admin FROM players WHERE id = ?',
      [playerId]
    );
    if ((pRows as any[]).length === 0) {
      res.status(404).json({ error: '玩家不存在' });
      return;
    }

    const [genRows] = await pool.execute(
      'SELECT general_id, advancement FROM player_generals WHERE player_id = ?',
      [playerId]
    );
    const generals: Record<string, number> = {};
    for (const r of genRows as any[]) {
      generals[r.general_id] = r.advancement;
    }

    const [skillRows] = await pool.execute(
      'SELECT skill_id FROM player_skills WHERE player_id = ?',
      [playerId]
    );
    const skills: string[] = (skillRows as any[]).map((r: any) => r.skill_id);

    const p = (pRows as any[])[0];
    res.json({
      id: p.id, username: p.username, gold: p.gold, isAdmin: !!p.is_admin,
      generals, skills,
    });
  } catch (err) {
    console.error('Admin get player error:', err);
    res.status(500).json({ error: '获取玩家详情失败' });
  }
});

// PUT /api/admin/player/:id/gold
router.put('/player/:id/gold', async (req: Request, res: Response) => {
  try {
    const playerId = parseInt(req.params.id as string);
    const { gold } = req.body;
    if (isNaN(playerId) || typeof gold !== 'number' || gold < 0) {
      res.status(400).json({ error: '参数无效' });
      return;
    }
    await pool.execute('UPDATE players SET gold = ? WHERE id = ?', [gold, playerId]);
    res.json({ success: true, gold });
  } catch (err) {
    console.error('Admin set gold error:', err);
    res.status(500).json({ error: '修改金币失败' });
  }
});

// PUT /api/admin/player/:id/generals
router.put('/player/:id/generals', async (req: Request, res: Response) => {
  try {
    const playerId = parseInt(req.params.id as string);
    const { generalId, advancement } = req.body;
    if (isNaN(playerId) || !generalId || typeof advancement !== 'number') {
      res.status(400).json({ error: '参数无效' });
      return;
    }

    await pool.execute(
      'INSERT INTO player_generals (player_id, general_id, advancement) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE advancement = ?',
      [playerId, generalId, advancement, advancement]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Admin set general error:', err);
    res.status(500).json({ error: '修改武将失败' });
  }
});

// DELETE /api/admin/player/:id/generals/:generalId
router.delete('/player/:id/generals/:generalId', async (req: Request, res: Response) => {
  try {
    const playerId = parseInt(req.params.id as string);
    const generalId = req.params.generalId as string;
    await pool.execute(
      'DELETE FROM player_generals WHERE player_id = ? AND general_id = ?',
      [playerId, generalId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Admin remove general error:', err);
    res.status(500).json({ error: '移除武将失败' });
  }
});

// PUT /api/admin/player/:id/skills
router.put('/player/:id/skills', async (req: Request, res: Response) => {
  try {
    const playerId = parseInt(req.params.id as string);
    const { skillId } = req.body;
    if (isNaN(playerId) || !skillId) {
      res.status(400).json({ error: '参数无效' });
      return;
    }
    await pool.execute(
      'INSERT IGNORE INTO player_skills (player_id, skill_id) VALUES (?, ?)',
      [playerId, skillId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Admin add skill error:', err);
    res.status(500).json({ error: '添加战法失败' });
  }
});

// DELETE /api/admin/player/:id/skills/:skillId
router.delete('/player/:id/skills/:skillId', async (req: Request, res: Response) => {
  try {
    const playerId = parseInt(req.params.id as string);
    const skillId = req.params.skillId as string;
    await pool.execute(
      'DELETE FROM player_skills WHERE player_id = ? AND skill_id = ?',
      [playerId, skillId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Admin remove skill error:', err);
    res.status(500).json({ error: '移除战法失败' });
  }
});

export default router;
