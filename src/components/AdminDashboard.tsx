import { useState, useEffect } from 'react';
import { quizData } from '../data/quizData';

interface ActivityLog {
  categoryName: string;
  partId: number;
  partTitle: string;
  quizType: string;
  score: number;
  completedAt: string;
}

interface UserProgressData {
  id: number;
  username: string;
  role: string;
  name: string | null;
  phone: string | null;
  careRobots: string[] | null;
  level: number | null;
  xp: number | null;
  xpToNextLevel: number | null;
  badges: Record<string, boolean> | null;
  preQuizCompleted: Record<string, boolean> | null;
  updated_at: string | null;
  activities: ActivityLog[];
}

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
}

export function AdminDashboard({ token, onLogout }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const getCategoryCompletionPercent = (userBadges: Record<string, boolean> | null, catId: string) => {
    const badges = userBadges || {};
    const cat = quizData.find(c => c.id === catId);
    if (!cat) return 0;
    let count = 0;
    cat.parts.forEach(part => {
      if (badges[`${catId}-${part.id}`]) {
        count++;
      }
    });
    return Math.round((count / cat.parts.length) * 100);
  };

  const toggleExpandUser = (userId: number) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
    } else {
      setExpandedUserId(userId);
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

  // Filter users by name or username
  const filteredUsers = users.filter(user => {
    const name = user.name || '';
    const username = user.username || '';
    const query = searchQuery.toLowerCase().trim();
    return name.toLowerCase().includes(query) || username.toLowerCase().includes(query);
  });

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

      {/* Search Input Box */}
      {!loading && !error && users.length > 0 && (
        <div className="card-glow" style={{ padding: '14px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '1.2rem' }}>🔍</span>
          <input
            type="text"
            placeholder="회원 이름 또는 아이디로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '1rem',
              color: 'var(--text-main)',
              fontFamily: 'var(--font-game)'
            }}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{ 
                background: 'none', 
                color: 'var(--color-primary)', 
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer' 
              }}
            >
              초기화
            </button>
          )}
        </div>
      )}

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
      ) : filteredUsers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }} className="card-glow">
          검색어와 일치하는 학습자가 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {searchQuery && (
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', paddingLeft: '4px' }}>
              검색 결과: <strong>{filteredUsers.length}</strong>명 / 총 {totalUsers}명
            </div>
          )}
          {filteredUsers.map((user) => {
            const userLvl = user.level || 1;
            const userXp = user.xp || 0;
            const xpMax = user.xpToNextLevel || 100;
            const xpPercentage = Math.min(100, Math.floor((userXp / xpMax) * 100));
            const isExpanded = expandedUserId === user.id;

            return (
              <div key={user.id} className="card-glow" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Main Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      👤 {user.name || '미등록 학습자'} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>(ID: {user.username})</span>
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      📞 연락처: {user.phone || '미등록'} | 🕒 최근 활동: {user.updated_at ? new Date(user.updated_at).toLocaleString('ko-KR') : '기록 없음'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span className="user-level-badge" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>Lvl {userLvl}</span>
                    <button 
                      className="secondary-btn" 
                      onClick={() => toggleExpandUser(user.id)}
                      style={{ padding: '6px 16px', fontSize: '0.85rem' }}
                    >
                      {isExpanded ? '상세 닫기 ▲' : '상세 보기 ▼'}
                    </button>
                  </div>
                </div>

                {/* Profile Summary & Simple Progress Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div>
                    <div className="stat-row" style={{ fontSize: '0.85rem' }}>
                      <span className="stat-label">경험치 (XP)</span>
                      <span className="stat-value">{userXp} / {xpMax} XP ({xpPercentage}%)</span>
                    </div>
                    <div className="progress-bar-container" style={{ height: '8px', marginTop: '6px' }}>
                      <div className="progress-bar-fill" style={{ width: `${xpPercentage}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <span className="stat-label" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>주요 사용 로봇</span>
                    {user.careRobots && user.careRobots.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {user.careRobots.map(robotId => {
                          const robot = quizData.find(r => r.id === robotId);
                          return (
                            <span key={robotId} className="badge-pill" style={{ background: 'rgba(124, 58, 237, 0.05)', color: 'var(--color-primary)' }}>
                              {robot ? `${robot.icon} ${robot.name}` : robotId}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>로봇 정보 없음</span>
                    )}
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="slide-up-anim" style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                    
                    {/* Detailed Robot Progress % */}
                    <div>
                      <h4 style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '12px' }}>📊 로봇별 진척도 (%)</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {quizData.map(category => {
                          const percent = getCategoryCompletionPercent(user.badges, category.id);
                          return (
                            <div key={category.id}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
                                <span style={{ fontWeight: 600 }}>{category.icon} {category.name}</span>
                                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{percent}%</span>
                              </div>
                              <div className="progress-bar-container" style={{ height: '6px' }}>
                                <div 
                                  className="progress-bar-fill" 
                                  style={{ 
                                    width: `${percent}%`, 
                                    background: percent === 100 
                                      ? 'linear-gradient(to right, var(--color-neon-cyan), var(--color-neon-green))' 
                                      : 'var(--color-primary)'
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Timeline Activity Logs */}
                    <div>
                      <h4 style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '12px' }}>🕒 최근 학습 히스토리</h4>
                      {user.activities && user.activities.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                          {user.activities.map((activity, idx) => (
                            <div 
                              key={idx} 
                              style={{ 
                                borderLeft: '2px solid var(--color-neon-pink)', 
                                paddingLeft: '10px',
                                fontSize: '0.8rem',
                                display: 'flex',
                                justifyContent: 'space-between'
                              }}
                            >
                              <div>
                                <strong style={{ color: 'var(--text-main)', display: 'block' }}>{activity.categoryName}</strong>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  Part {activity.partId}. {activity.partTitle}, {activity.quizType === 'pre' ? '사전 퀴즈' : '평가 퀴즈'}
                                </span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ display: 'block', fontWeight: 700, color: 'var(--color-neon-green)' }}>{activity.score}점</span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                  {new Date(activity.completedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>학습 로그 기록이 없습니다.</span>
                      )}
                    </div>

                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
