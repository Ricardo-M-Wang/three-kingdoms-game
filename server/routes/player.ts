import { Router, Request, Response } from 'express';
import pool from '../db';
import { authRequired } from '../middleware/auth';

const router = Router();
router.use(authRequired);

// GET /api/player/me
router.get('/me', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, gold, is_admin FROM players WHERE id = ?',
      [req.player!.id]
    );
    const players = rows as any[];
    if (players.length === 0) {
      res.status(404).json({ error: '玩家不存在' });
      return;
    }
    const p = players[0];
    res.json({ id: p.id, username: p.username, gold: p.gold, isAdmin: !!p.is_admin });
  } catch (err) {
    console.error('Get player error:', err);
    res.status(500).json({ error: '获取玩家信息失败' });
  }
});

// GET /api/player/full
router.get('/full', async (req: Request, res: Response) => {
  try {
    const playerId = req.player!.id;

    const [playerRows] = await pool.execute(
      'SELECT id, username, gold, is_admin FROM players WHERE id = ?',
      [playerId]
    );
    const players = playerRows as any[];
    if (players.length === 0) {
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

    const p = players[0];
    res.json({
      id: p.id,
      username: p.username,
      gold: p.gold,
      isAdmin: !!p.is_admin,
      generals,
      skills,
    });
  } catch (err) {
    console.error('Get full player error:', err);
    res.status(500).json({ error: '获取玩家数据失败' });
  }
});

// PUT /api/player/gacharesult
router.put('/gacharesult', async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const playerId = req.player!.id;
    const { cost, result, results } = req.body;

    // Support both single result and batch results
    const allResults = results || (result ? [result] : []);
    if (!cost || allResults.length === 0) {
      res.status(400).json({ error: '参数不完整' });
      return;
    }

    await conn.beginTransaction();

    // Deduct gold
    const [goldRows] = await conn.execute('SELECT gold FROM players WHERE id = ? FOR UPDATE', [playerId]);
    const currentGold = (goldRows as any[])[0]?.gold ?? 0;
    if (currentGold < cost) {
      await conn.rollback();
      res.status(400).json({ error: '金币不足' });
      return;
    }
    await conn.execute('UPDATE players SET gold = gold - ? WHERE id = ?', [cost, playerId]);

    // Apply each result
    for (const r of allResults) {
      if (r.type === 'general') {
        const [existing] = await conn.execute(
          'SELECT advancement FROM player_generals WHERE player_id = ? AND general_id = ?',
          [playerId, r.id]
        );
        const existingRows = existing as any[];
        if (existingRows.length > 0) {
          const currentAdv = existingRows[0].advancement;
          if (currentAdv >= 5) {
            await conn.execute('UPDATE players SET gold = gold + 50 WHERE id = ?', [playerId]);
          } else {
            await conn.execute(
              'UPDATE player_generals SET advancement = advancement + 1 WHERE player_id = ? AND general_id = ?',
              [playerId, r.id]
            );
          }
        } else {
          await conn.execute(
            'INSERT INTO player_generals (player_id, general_id, advancement) VALUES (?, ?, 1)',
            [playerId, r.id]
          );
        }
      } else if (r.type === 'skill') {
        // Skip gold_refund placeholder
        if (r.id === 'gold_refund') continue;
        const [existing] = await conn.execute(
          'SELECT id FROM player_skills WHERE player_id = ? AND skill_id = ?',
          [playerId, r.id]
        );
        if ((existing as any[]).length === 0) {
          await conn.execute(
            'INSERT INTO player_skills (player_id, skill_id) VALUES (?, ?)',
            [playerId, r.id]
          );
        }
      }
    }

    await conn.commit();

    // Return updated full state
    const [pRows] = await conn.execute('SELECT id, username, gold, is_admin FROM players WHERE id = ?', [playerId]);
    const p = (pRows as any[])[0];

    const [genRows] = await conn.execute('SELECT general_id, advancement FROM player_generals WHERE player_id = ?', [playerId]);
    const generals: Record<string, number> = {};
    for (const r of genRows as any[]) {
      generals[r.general_id] = r.advancement;
    }

    const [skillRows] = await conn.execute('SELECT skill_id FROM player_skills WHERE player_id = ?', [playerId]);
    const skills: string[] = (skillRows as any[]).map((r: any) => r.skill_id);

    res.json({
      id: p.id, username: p.username, gold: p.gold, isAdmin: !!p.is_admin,
      generals, skills,
    });
  } catch (err) {
    await conn.rollback();
    console.error('Gacha result error:', err);
    res.status(500).json({ error: '抽卡处理失败' });
  } finally {
    conn.release();
  }
});

// POST /api/player/reset
router.post('/reset', async (req: Request, res: Response) => {
  try {
    const playerId = req.player!.id;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('UPDATE players SET gold = 2000 WHERE id = ?', [playerId]);
      await conn.execute('DELETE FROM player_generals WHERE player_id = ?', [playerId]);
      await conn.execute('DELETE FROM player_skills WHERE player_id = ?', [playerId]);
      await conn.commit();
      res.json({ success: true, gold: 2000, generals: {}, skills: [] });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ error: '重置失败' });
  }
});

export default router;
