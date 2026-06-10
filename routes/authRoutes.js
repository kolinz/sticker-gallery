import { Router } from 'express';
import db from '../lib/database.js';
import { verifyPassword, signToken } from '../lib/auth.js';

const router = Router();

// ダミーハッシュ：ユーザーが存在しない場合も verifyPassword を必ず実行して timing attack を防ぐ
const DUMMY_HASH = `${'ff'.repeat(16)}:${'ff'.repeat(64)}`;

/**
 * POST /api/auth/login
 * { username, password } → { token, user: { id, username, displayName, role } }
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body ?? {};

    if (!username || !password) {
      return res.status(400).json({ error: 'username と password は必須です' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    const storedHash = user?.password_hash ?? DUMMY_HASH;
    const valid      = await verifyPassword(password, storedHash);

    if (!user || !valid) {
      return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
    }

    const token = signToken({ sub: user.id, username: user.username, role: user.role });

    return res.json({
      token,
      user: {
        id:          user.id,
        username:    user.username,
        displayName: user.display_name ?? null,
        role:        user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
