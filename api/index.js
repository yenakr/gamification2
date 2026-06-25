import express from 'express';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jsonwebtoken from 'jsonwebtoken';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_gamification_token_key_123!';

// Setup pg Pool
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Database initialization
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gamification2_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gamification2_user_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES gamification2_users(id) ON DELETE CASCADE,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        xp_to_next_level INTEGER DEFAULT 100,
        badges JSONB DEFAULT '{}',
        pre_quiz_completed JSONB DEFAULT '{}',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables verified/created.');

    const adminCheck = await pool.query('SELECT * FROM gamification2_users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('hycarerobot7211!', 10);
      const insertAdmin = await pool.query(
        'INSERT INTO gamification2_users (username, password, role) VALUES ($1, $2, $3) RETURNING id',
        ['admin', hashedPassword, 'admin']
      );
      const adminId = insertAdmin.rows[0].id;

      await pool.query(
        'INSERT INTO gamification2_user_progress (user_id, level, xp, xp_to_next_level) VALUES ($1, 1, 0, 100)',
        [adminId]
      );
      console.log('Default admin account created.');
    }
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

// Run database setup
initDb();

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '인증 토큰이 누락되었습니다.' });
  }

  jsonwebtoken.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
    }
    req.user = user;
    next();
  });
};

// API Routes
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 모두 입력해주세요.' });
  }

  try {
    const userCheck = await pool.query('SELECT * FROM gamification2_users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO gamification2_users (username, password, role) VALUES ($1, $2, $3) RETURNING id',
      [username, hashedPassword, 'user']
    );
    const userId = result.rows[0].id;

    await pool.query(
      'INSERT INTO gamification2_user_progress (user_id, level, xp, xp_to_next_level, badges, pre_quiz_completed) VALUES ($1, 1, 0, 100, $2, $3)',
      [userId, '{}', '{}']
    );

    res.status(201).json({ message: '회원가입이 완료되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }

  try {
    const result = await pool.query('SELECT * FROM gamification2_users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: '아이디 또는 비밀번호가 틀렸습니다.' });
    }

    const user = result.rows[0];
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ error: '아이디 또는 비밀번호가 틀렸습니다.' });
    }

    const token = jsonwebtoken.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
});

app.post('/api/progress/save', authenticateToken, async (req, res) => {
  const { level, xp, xpToNextLevel, badges, preQuizCompleted } = req.body;
  const userId = req.user.id;

  try {
    await pool.query(
      `INSERT INTO gamification2_user_progress (user_id, level, xp, xp_to_next_level, badges, pre_quiz_completed, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET level = EXCLUDED.level,
           xp = EXCLUDED.xp,
           xp_to_next_level = EXCLUDED.xp_to_next_level,
           badges = EXCLUDED.badges,
           pre_quiz_completed = EXCLUDED.pre_quiz_completed,
           updated_at = NOW()`,
      [userId, level, xp, xpToNextLevel, JSON.stringify(badges), JSON.stringify(preQuizCompleted)]
    );

    res.json({ message: '저장 완료' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 에러' });
  }
});

app.get('/api/progress/load', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'SELECT level, xp, xp_to_next_level as "xpToNextLevel", badges, pre_quiz_completed as "preQuizCompleted" FROM gamification2_user_progress WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        badges: {},
        preQuizCompleted: {}
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 에러' });
  }
});

app.get('/api/admin/users-progress', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '권한 없음' });
  }

  try {
    const result = await pool.query(`
      SELECT 
        u.id, 
        u.username, 
        u.role, 
        p.level, 
        p.xp, 
        p.xp_to_next_level as "xpToNextLevel", 
        p.badges, 
        p.pre_quiz_completed as "preQuizCompleted",
        p.updated_at
      FROM gamification2_users u
      LEFT JOIN gamification2_user_progress p ON u.id = p.user_id
      WHERE u.role != 'admin'
      ORDER BY p.updated_at DESC NULLS LAST, u.username ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 에러' });
  }
});

// For local testing: serve dist static files
app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

// Start local server if run directly (not as a serverless function)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running locally on port ${PORT}`);
  });
}

export default app;
