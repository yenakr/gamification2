import React, { useState } from 'react';
import { quizData, type RobotCategory } from '../data/quizData';
import { sfx } from '../utils/soundEffects';
import { CertificateGenerator } from '../utils/CertificateGenerator';

interface ActivityLog {
  categoryName: string;
  partId: number;
  partTitle: string;
  quizType: string;
  score: number;
  completedAt: string;
}

interface UserProfile {
  name: string;
  phone: string;
  careRobots: string[];
}

interface DashboardProps {
  level: number;
  xp: number;
  xpToNextLevel: number;
  badges: Record<string, boolean>; // key format: "category-part" (e.g. "excretion-1")
  onSelectCategory: (category: RobotCategory) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  profile: UserProfile | null;
  onEditProfile: () => void;
  activities: ActivityLog[];
  isGuest?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  level,
  xp,
  xpToNextLevel,
  badges,
  onSelectCategory,
  isMuted,
  onToggleMute,
  profile,
  onEditProfile,
  activities,
  isGuest = false
}) => {
  const [showXpModal, setShowXpModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'report'>('map');
  const [certSearchQuery, setCertSearchQuery] = useState('');
  const [selectedCertCategory, setSelectedCertCategory] = useState<string>('all');

  const getCategoryCompletionPercent = (catId: string) => {
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

  const getCategoryCompletionCount = (catId: string) => {
    let count = 0;
    const cat = quizData.find(c => c.id === catId);
    if (!cat) return 0;
    cat.parts.forEach(part => {
      if (badges[`${catId}-${part.id}`]) {
        count++;
      }
    });
    return count;
  };

  const getRankName = (lvl: number) => {
    if (lvl === 1) return '초보 돌보미';
    if (lvl === 2) return '주니어 돌보미';
    if (lvl === 3) return '시니어 돌보미';
    if (lvl === 4) return '전문 돌보미';
    return '마스터 돌보미';
  };

  const totalParts = quizData.reduce((acc, cat) => acc + cat.parts.length, 0);
  const totalBadges = Object.values(badges).filter(Boolean).length;
  const xpPercent = Math.min(100, Math.floor((xp / xpToNextLevel) * 100));
  const overallCompletionPercent = Math.round((totalBadges / totalParts) * 100);

  const handleCategoryClick = (cat: RobotCategory) => {
    sfx.playClick();
    onSelectCategory(cat);
  };

  return (
    <div className="dashboard-container">
      <header className="game-header">
        <div className="logo-section">
          <span className="logo-emoji">🤖</span>
          <div>
            <h1 className="logo-title">Care Bot Quiz</h1>
            <p className="logo-subtitle">돌봄로봇 교육 플랫폼</p>
          </div>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
          {!isGuest && (
            <button 
              className="secondary-btn"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              onClick={() => {
                sfx.playClick();
                onEditProfile();
              }}
            >
              👤 프로필 설정
            </button>
          )}
          <button 
            className="mute-btn" 
            onClick={() => {
              sfx.setMute(!isMuted);
              onToggleMute();
              sfx.playClick();
            }}
          >
            {isMuted ? '🔇 음소거 해제' : '🔊 음소거'}
          </button>
        </div>
      </header>

      {/* Hero Stats */}
      <section 
        className="stats-board card-glow" 
        style={{ cursor: 'pointer' }}
        onClick={() => {
          sfx.playClick();
          setShowXpModal(true);
        }}
        title="클릭하여 레벨 기준 및 획득 조건 보기"
      >
        <div className="player-avatar-section">
          <div className="avatar-frame">
            <span className="avatar-emoji">🌟</span>
          </div>
          <div className="player-info">
            <h2 className="player-rank">{getRankName(level)}</h2>
            <div className="level-badge">LV. {level}</div>
          </div>
        </div>

        <div className="stats-progress-section">
          <div className="stat-row">
            <span>EXP 경험치</span>
            <span>{xp} / {xpToNextLevel} ({xpPercent}%)</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${xpPercent}%` }}></div>
          </div>
        </div>

        <div className="badge-count-section">
          <span className="stat-label">전체 완료율</span>
          <span className="stat-value" style={{ color: 'var(--color-neon-cyan)' }}>
            📊 {overallCompletionPercent}% ({totalBadges} / {totalParts})
          </span>
        </div>
      </section>

      {/* Tab Nav Bar */}
      <div className="admin-nav-bar" style={{ padding: '6px', margin: '20px 0', background: 'rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <button
            className={activeTab === 'map' ? 'primary-btn' : 'secondary-btn'}
            style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '0.95rem' }}
            onClick={() => {
              sfx.playClick();
              setActiveTab('map');
            }}
          >
            🗺️ 돌봄로봇 퀴즈 지도
          </button>
          <button
            className={activeTab === 'report' ? 'primary-btn' : 'secondary-btn'}
            style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '0.95rem' }}
            onClick={() => {
              sfx.playClick();
              setActiveTab('report');
            }}
          >
            📈 나의 학습기록
          </button>
        </div>
      </div>

      {/* Level-Up Info Modal */}
      {showXpModal && (
        <div className="level-up-overlay slide-up-anim" onClick={() => setShowXpModal(false)}>
          <div className="level-up-alert card-glow" onClick={(e) => e.stopPropagation()}>
            <span className="lvl-alert-emoji">⭐</span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>돌보미 등급 및 경험치 기준</h2>
            
            <div style={{ margin: '20px 0', textAlign: 'left', lineHeight: '1.6', fontSize: '0.95rem' }}>
              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px dotted rgba(0,0,0,0.12)' }}>
                <strong style={{ color: 'var(--color-primary)', display: 'block', marginBottom: '8px' }}>📋 등급별 호칭</strong>
                • LV. 1 : 초보 돌보미<br />
                • LV. 2 : 주니어 돌보미<br />
                • LV. 3 : 시니어 돌보미<br />
                • LV. 4 : 전문 돌보미<br />
                • LV. 5+ : 마스터 돌보미
              </div>
              <div>
                <strong style={{ color: 'var(--color-primary)', display: 'block', marginBottom: '8px' }}>⚡ 경험치 획득 기준</strong>
                • 사전 퀴즈 완료: <strong>+25 XP</strong><br />
                • 평가 퀴즈 완료: <strong>+60 XP</strong>
              </div>
            </div>

            <button className="primary-btn" onClick={() => setShowXpModal(false)}>확인</button>
          </div>
        </div>
      )}

      {/* Tab: Map (Default Categories Grid) */}
      {activeTab === 'map' && (
        <main className="quest-map-area slide-up-anim">
          <h2 className="section-title">돌봄로봇 목록</h2>
          <div className="categories-grid">
            {quizData.map((category) => {
              const completedCount = getCategoryCompletionCount(category.id);
              const isCompleted = completedCount === category.parts.length;

              return (
                <div 
                  key={category.id} 
                  className={`category-card ${isCompleted ? 'category-finished' : ''}`}
                  onClick={() => handleCategoryClick(category)}
                >
                  <div className="card-top">
                    <span className="cat-icon">{category.icon}</span>
                    <span className="cat-badge">{completedCount}/{category.parts.length} 완료</span>
                  </div>
                  <h3 className="cat-name">{category.name}</h3>
                  <div className="card-footer" style={{ borderTop: 'none', marginTop: '0', paddingTop: '0' }}>
                    <div className="mini-progress-track">
                      {category.parts.map((part) => (
                        <span 
                          key={part.id} 
                          className={`mini-dot ${badges[`${category.id}-${part.id}`] ? 'active' : ''}`}
                        />
                      ))}
                    </div>
                    <button className="enter-btn">퀴즈 풀기 →</button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* Tab: Report (Detailed Profile, Category Progress %, and Activities) */}
      {activeTab === 'report' && (
        <main className="quest-map-area slide-up-anim">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            
            {/* Left Column: Profile Card & Category Progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Profile Details Card */}
              <div className="card-glow" style={{ padding: '24px', textAlign: 'left' }}>
                {isGuest ? (
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: '8px' }}>👤 게스트 모드</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.6' }}>
                      게스트 모드로 간편 체험 중입니다.<br />
                      회원가입 후 로그인하시면 학습 이력 저장과 프로필 등록이 가능합니다.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontWeight: 800, fontSize: '1.15rem' }}>👤 나의 프로필 정보</h3>
                      <button 
                        className="secondary-btn" 
                        onClick={onEditProfile}
                        style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: '15px' }}
                      >
                        수정
                      </button>
                    </div>
                    
                    {profile ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>이름(실명)</span>
                          <strong style={{ color: 'var(--text-main)' }}>{profile.name}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>전화번호</span>
                          <strong style={{ color: 'var(--text-main)' }}>{profile.phone}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>주요 돌봄로봇</span>
                          {profile.careRobots && profile.careRobots.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {profile.careRobots.map(robotId => {
                                const robot = quizData.find(r => r.id === robotId);
                                return (
                                  <span key={robotId} className="badge-pill">
                                    {robot ? `${robot.icon} ${robot.name}` : robotId}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-muted)' }}>등록된 로봇 없음</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        프로필 정보가 등록되지 않았습니다.<br />
                        [수정] 버튼을 눌러 등록해주세요.
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Progress Bar per Care Robot */}
              <div className="card-glow" style={{ padding: '24px', textAlign: 'left' }}>
                <h3 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: '16px' }}>📊 로봇별 진척도 (%)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {quizData.map(category => {
                    const percent = getCategoryCompletionPercent(category.id);
                    return (
                      <div key={category.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600 }}>{category.icon} {category.name}</span>
                          <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{percent}% ({getCategoryCompletionCount(category.id)}/{category.parts.length})</span>
                        </div>
                        <div className="progress-bar-container" style={{ height: '8px' }}>
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

              {/* Recent Activity Logs (Moved to Left Column) */}
              <div className="card-glow" style={{ padding: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: '16px' }}>🕒 최근 학습 기록 (최신 10개)</h3>
                
                {activities && activities.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '300px', paddingRight: '6px' }}>
                    {activities.map((activity, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          borderLeft: '3px solid var(--color-neon-pink)', 
                          paddingLeft: '12px',
                          paddingTop: '4px',
                          paddingBottom: '4px',
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center' 
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.9rem', display: 'block', color: 'var(--text-main)' }}>
                            {activity.categoryName}
                          </strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Part {activity.partId}. {activity.partTitle}, {activity.quizType === 'pre' ? '사전 퀴즈' : '평가 퀴즈'}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-neon-green)' }}>
                            {activity.score}점
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {new Date(activity.completedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    아직 완료한 퀴즈 기록이 없습니다.<br />퀴즈를 풀고 이력을 쌓아보세요!
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Master Achievements & Certificate Re-issue Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Master Achievements Card */}
              <div className="card-glow" style={{ padding: '24px', textAlign: 'left' }}>
                <h3 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: '8px' }}>🏆 마스터 업적</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '16px', lineHeight: '1.4' }}>
                  각 돌봄로봇 분야의 모든 평가 과정을 100% 완료하면 해당 로봇 분야의 <strong>골드 마스터 이수증</strong>을 획득할 수 있습니다.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {quizData.map(category => {
                    const completedCount = getCategoryCompletionCount(category.id);
                    const totalCount = category.parts.length;
                    const isCompleted = completedCount === totalCount;
                    const percent = getCategoryCompletionPercent(category.id);

                    return (
                      <div key={category.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: isCompleted ? '#f59e0b' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isCompleted ? '👑' : '🔒'} {category.name} {isCompleted && '★'}
                          </strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            완료: {completedCount}/{totalCount} 파트 ({percent}%)
                          </span>
                        </div>
                        {isCompleted ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="primary-btn"
                              style={{ 
                                padding: '4px 8px', 
                                fontSize: '0.7rem', 
                                borderRadius: '8px', 
                                background: 'linear-gradient(135deg, #f59e0b, #eab308)',
                                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.2)'
                              }}
                              onClick={() => {
                                CertificateGenerator.downloadImage(
                                  profile?.name || '학습자',
                                  `${category.name} 종합 마스터 과정`,
                                  100,
                                  0,
                                  true
                                );
                              }}
                            >
                              📥 이미지
                            </button>
                            <button
                              className="secondary-btn"
                              style={{ 
                                padding: '4px 8px', 
                                fontSize: '0.7rem', 
                                borderRadius: '8px',
                                border: '1.5px solid #f59e0b',
                                color: '#d97706'
                              }}
                              onClick={() => {
                                CertificateGenerator.printPdf(
                                  profile?.name || '학습자',
                                  `${category.name} 종합 마스터 과정`,
                                  100,
                                  0,
                                  true
                                );
                              }}
                            >
                              🖨️ PDF
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            진행 중
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Certificate Re-issue Card */}
              <div className="card-glow" style={{ padding: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '1.15rem', margin: 0 }}>📜 이수증 재발급</h3>
                </div>

                {/* Category Filter Tabs */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '6px', borderBottom: '1px solid var(--border-color)' }}>
                  <button
                    onClick={() => { sfx.playClick(); setSelectedCertCategory('all'); }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: selectedCertCategory === 'all' ? 'var(--color-primary)' : 'rgba(0,0,0,0.03)',
                      color: selectedCertCategory === 'all' ? '#fff' : 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    전체
                  </button>
                  {quizData.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { sfx.playClick(); setSelectedCertCategory(cat.id); }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: selectedCertCategory === cat.id ? 'var(--color-primary)' : 'rgba(0,0,0,0.03)',
                        color: selectedCertCategory === cat.id ? '#fff' : 'var(--text-main)',
                        border: '1px solid var(--border-color)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {cat.icon} {cat.name.replace('돌봄로봇', '').trim()}
                    </button>
                  ))}
                </div>

                {/* Certificate Search Bar */}
                <div style={{ padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '1rem' }}>🔍</span>
                  <input
                    type="text"
                    placeholder="로봇 명칭 또는 파트 제목으로 검색..."
                    value={certSearchQuery}
                    onChange={(e) => setCertSearchQuery(e.target.value)}
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: '0.85rem',
                      color: 'var(--text-main)',
                      fontFamily: 'var(--font-game)'
                    }}
                  />
                  {certSearchQuery && (
                    <button 
                      onClick={() => setCertSearchQuery('')}
                      style={{ 
                        background: 'none', 
                        color: 'var(--color-primary)', 
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer' 
                      }}
                    >
                      초기화
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '350px', paddingRight: '4px', flex: 1 }}>
                  {(() => {
                    const completedParts: { category: RobotCategory; part: any }[] = [];
                    quizData.forEach(cat => {
                      cat.parts.forEach(part => {
                        if (badges[`${cat.id}-${part.id}`]) {
                          completedParts.push({ category: cat, part });
                        }
                      });
                    });

                    if (completedParts.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '0.9rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          아직 완료된 평가 과정이 없습니다.
                        </div>
                      );
                    }

                    const filteredParts = completedParts.filter(({ category, part }) => {
                      const matchesCategory = selectedCertCategory === 'all' || category.id === selectedCertCategory;
                      const query = certSearchQuery.toLowerCase().trim();
                      const matchesSearch = category.name.toLowerCase().includes(query) || part.title.toLowerCase().includes(query);
                      return matchesCategory && matchesSearch;
                    });

                    if (filteredParts.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '0.9rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          해당 분류나 검색 조건에 맞는 이수증이 없습니다.
                        </div>
                      );
                    }

                    return filteredParts.map(({ category, part }) => (
                      <div key={`${category.id}-${part.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--text-main)' }}>{category.name}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Part {part.id}. {part.title}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className="secondary-btn" 
                            style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '8px' }}
                            onClick={() => {
                              CertificateGenerator.downloadImage(
                                profile?.name || '학습자',
                                `${category.name} - ${part.title}`,
                                100,
                                0
                              );
                            }}
                          >
                            📥 이미지
                          </button>
                          <button 
                            className="secondary-btn" 
                            style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '8px' }}
                            onClick={() => {
                              CertificateGenerator.printPdf(
                                profile?.name || '학습자',
                                `${category.name} - ${part.title}`,
                                100,
                                0
                              );
                            }}
                          >
                            🖨️ PDF
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

            </div>

          </div>
        </main>
      )}
    </div>
  );
};
