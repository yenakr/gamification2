import React from 'react';
import { quizData, type RobotCategory } from '../data/quizData';
import { sfx } from '../utils/soundEffects';

interface DashboardProps {
  level: number;
  xp: number;
  xpToNextLevel: number;
  badges: Record<string, boolean>; // key format: "category-part" (e.g. "excretion-1")
  onSelectCategory: (category: RobotCategory) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  level,
  xp,
  xpToNextLevel,
  badges,
  onSelectCategory,
  isMuted,
  onToggleMute
}) => {
  const getCategoryCompletionCount = (catId: string) => {
    let count = 0;
    for (let p = 1; p <= 5; p++) {
      if (badges[`${catId}-${p}`]) {
        count++;
      }
    }
    return count;
  };

  const totalBadges = Object.values(badges).filter(Boolean).length;
  const xpPercent = Math.min(100, Math.floor((xp / xpToNextLevel) * 100));

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
            <h1 className="logo-title">Care Bot Quest</h1>
            <p className="logo-subtitle">돌봄로봇 마스터를 향한 모험</p>
          </div>
        </div>
        <div className="header-actions">
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
      <section className="stats-board card-glow">
        <div className="player-avatar-section">
          <div className="avatar-frame">
            <span className="avatar-emoji">🌟</span>
          </div>
          <div className="player-info">
            <h2 className="player-rank">초보 돌봄 요원</h2>
            <div className="level-badge">LV. {level}</div>
          </div>
        </div>

        <div className="stats-progress-section">
          <div className="stat-row">
            <span>EXP 경험치</span>
            <span>{xp} / {xpToNextLevel}</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${xpPercent}%` }}></div>
          </div>
        </div>

        <div className="badge-count-section">
          <span className="stat-label">획득 훈장</span>
          <span className="stat-value">🏆 {totalBadges} / 25</span>
        </div>
      </section>

      {/* Quest Map Area */}
      <main className="quest-map-area">
        <h2 className="section-title">퀘스트 월드 맵</h2>
        <div className="categories-grid">
          {quizData.map((category) => {
            const completedCount = getCategoryCompletionCount(category.id);
            const isCompleted = completedCount === 5;

            return (
              <div 
                key={category.id} 
                className={`category-card ${isCompleted ? 'category-finished' : ''}`}
                onClick={() => handleCategoryClick(category)}
              >
                <div className="card-top">
                  <span className="cat-icon">{category.icon}</span>
                  <span className="cat-badge">{completedCount}/5 완료</span>
                </div>
                <h3 className="cat-name">{category.name}</h3>
                <p className="cat-desc">{category.description}</p>
                <div className="card-footer">
                  <div className="mini-progress-track">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <span 
                        key={idx} 
                        className={`mini-dot ${badges[`${category.id}-${idx + 1}`] ? 'active' : ''}`}
                      />
                    ))}
                  </div>
                  <button className="enter-btn">탐험 시작 →</button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
