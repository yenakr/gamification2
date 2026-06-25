import { useState, useEffect } from 'react';

interface UserProgressData {
  id: number;
  username: string;
  role: string;
  level: number | null;
  xp: number | null;
  xpToNextLevel: number | null;
  badges: Record<string, boolean> | null;
  preQuizCompleted: Record<string, boolean> | null;
  updated_at: string | null;
}

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
}

export function AdminDashboard({ token, onLogout }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsersProgress();
  }, []);

  const fetchUsersProgress = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/admin/users-progress', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '데이터를 불러오는 중 에러가 발생했습니다.');
      }

      setUsers(data);
    } catch (err: any) {
      setError(err.message || '사용자 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Helper stats
  const totalUsers = users.length;
  const avgLevel = totalUsers > 0
    ? (users.reduce((acc, user) => acc + (user.level || 1), 0) / totalUsers).toFixed(1)
    : '0';
  const totalBadges = users.reduce((acc, user) => {
    const badgeCount = user.badges ? Object.keys(user.badges).length : 0;
    return acc + badgeCount;
  }, 0);

  const formatPartName = (key: string) => {
    // Key format: 'category-part' (e.g. 'hygiene-wash')
    // Just replace hyphens or make uppercase for display
    return key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div style={{ padding: '20px 0' }} className="slide-up-anim">
      <div className="admin-header">
        <div className="admin-title-area">
          <h1>관리자 대시보드 <span className="admin-indicator">Admin System</span></h1>
          <p>사용자들의 학습 참여 및 퀴즈 달성도를 모니터링합니다.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="secondary-btn" onClick={fetchUsersProgress} disabled={loading}>
            새로고침
          </button>
          <button className="primary-btn" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="score-summary-grid" style={{ marginBottom: '30px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="summary-item card-glow">
          <span className="summary-lbl">총 학습자 수</span>
          <span className="summary-val">👥 {totalUsers} 명</span>
        </div>
        <div className="summary-item card-glow">
          <span className="summary-lbl">평균 레벨</span>
          <span className="summary-val">⭐ Lvl {avgLevel}</span>
        </div>
        <div className="summary-item card-glow">
          <span className="summary-lbl">획득한 총 배지 수</span>
          <span className="summary-val">🏆 {totalBadges} 개</span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          데이터 로딩 중...
        </div>
      ) : error ? (
        <div className="error-message" style={{ margin: '20px 0' }}>
          {error}
        </div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }} className="card-glow">
          가입된 일반 사용자가 아직 없습니다.
        </div>
      ) : (
        <div className="user-grid">
          {users.map((user) => {
            const userLvl = user.level || 1;
            const userXp = user.xp || 0;
            const xpMax = user.xpToNextLevel || 100;
            const xpPercentage = Math.min(100, Math.floor((userXp / xpMax) * 100));
            const activeBadges = user.badges ? Object.keys(user.badges) : [];
            const activePreQuizzes = user.preQuizCompleted ? Object.keys(user.preQuizCompleted) : [];

            return (
              <div key={user.id} className="user-card card-glow">
                <div className="user-card-header">
                  <span className="user-name">👤 {user.username}</span>
                  <span className="user-level-badge">Lvl {userLvl}</span>
                </div>

                <div className="user-stats-list">
                  <div>
                    <div className="stat-row">
                      <span className="stat-label">경험치 (XP)</span>
                      <span className="stat-value">{userXp} / {xpMax} XP ({xpPercentage}%)</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${xpPercentage}%` }}></div>
                    </div>
                  </div>

                  <div className="stat-row">
                    <span className="stat-label">최근 학습 일자</span>
                    <span className="stat-value" style={{ fontSize: '0.8rem' }}>
                      {user.updated_at ? new Date(user.updated_at).toLocaleString('ko-KR') : '학습 기록 없음'}
                    </span>
                  </div>

                  <div>
                    <span className="stat-label" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>
                      사전 퀴즈 완료 ({activePreQuizzes.length})
                    </span>
                    {activePreQuizzes.length === 0 ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>완료된 퀴즈 없음</span>
                    ) : (
                      <div className="badge-grid-mini">
                        {activePreQuizzes.map((q) => (
                          <span key={q} className="badge-pill" style={{ background: 'rgba(14, 165, 233, 0.08)', borderColor: 'rgba(14, 165, 233, 0.15)', color: 'var(--color-neon-cyan)' }}>
                            {formatPartName(q)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="stat-label" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>
                      획득한 명예 훈장/배지 ({activeBadges.length})
                    </span>
                    {activeBadges.length === 0 ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>획득한 배지 없음</span>
                    ) : (
                      <div className="badge-grid-mini">
                        {activeBadges.map((b) => (
                          <span key={b} className="badge-pill">
                            🏅 {formatPartName(b)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
