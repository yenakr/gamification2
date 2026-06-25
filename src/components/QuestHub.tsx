import React from 'react';
import type { RobotCategory, PartData } from '../data/quizData';
import { sfx } from '../utils/soundEffects';

interface QuestHubProps {
  category: RobotCategory;
  badges: Record<string, boolean>; // format: "category-part" (post-quiz completes part)
  preQuizCompleted: Record<string, boolean>; // format: "category-part"
  onBack: () => void;
  onSelectPart: (part: PartData, mode: 'pre' | 'study' | 'post') => void;
}

export const QuestHub: React.FC<QuestHubProps> = ({
  category,
  badges,
  preQuizCompleted,
  onBack,
  onSelectPart
}) => {
  const isPartUnlocked = (partId: number) => {
    if (partId === 1) return true;
    // Unlocked if previous part's post-quiz is completed
    return !!badges[`${category.id}-${partId - 1}`];
  };

  const handleSelect = (part: PartData, mode: 'pre' | 'study' | 'post', locked: boolean) => {
    if (locked) {
      sfx.playWrong();
      return;
    }
    sfx.playClick();
    onSelectPart(part, mode);
  };

  return (
    <div className="questhub-container">
      <header className="page-header">
        <button 
          className="back-btn" 
          onClick={() => {
            sfx.playClick();
            onBack();
          }}
        >
          ← 로비로 돌아가기
        </button>
        <div className="category-header-info">
          <span className="cat-icon-large">{category.icon}</span>
          <div>
            <h1 className="hub-title">{category.name} 퀘스트 보드</h1>
            <p className="hub-desc">{category.description}</p>
          </div>
        </div>
      </header>

      <main className="quest-list">
        {category.parts.map((part) => {
          const unlocked = isPartUnlocked(part.id);
          const hasPreQuizDone = !!preQuizCompleted[`${category.id}-${part.id}`];
          const hasPostQuizDone = !!badges[`${category.id}-${part.id}`];

          return (
            <div 
              key={part.id} 
              className={`quest-row ${unlocked ? 'unlocked' : 'locked'} ${hasPostQuizDone ? 'completed' : ''}`}
            >
              <div className="quest-meta">
                <div className="quest-number">STAGE 0{part.id}</div>
                <h3 className="quest-title">{part.title}</h3>
              </div>

              {unlocked ? (
                <div className="quest-actions">
                  {/* Step 1: Pre-Quiz */}
                  <button 
                    className={`action-chip ${hasPreQuizDone ? 'done' : 'pending'}`}
                    onClick={() => handleSelect(part, 'pre', false)}
                  >
                    {hasPreQuizDone ? '✅ 사전 퀴즈 완료' : '🎯 사전 퀴즈 시작'}
                  </button>

                  {/* Step 2: Study (unlocked after pre-quiz) */}
                  <button 
                    className={`action-chip ${hasPreQuizDone ? 'unlocked-study' : 'locked-study'}`}
                    disabled={!hasPreQuizDone}
                    onClick={() => handleSelect(part, 'study', !hasPreQuizDone)}
                  >
                    📖 학습 스테이지
                  </button>

                  {/* Step 3: Post-Quiz (unlocked after pre-quiz, badges show when finished) */}
                  <button 
                    className={`action-chip ${hasPostQuizDone ? 'victory-badge' : hasPreQuizDone ? 'unlocked-post' : 'locked-post'}`}
                    disabled={!hasPreQuizDone}
                    onClick={() => handleSelect(part, 'post', !hasPreQuizDone)}
                  >
                    {hasPostQuizDone ? '🏆 훈장 획득 완료!' : '🔥 사후 퀴즈 도전'}
                  </button>
                </div>
              ) : (
                <div className="quest-locked-msg">
                  <span>🔒 이전 단계를 클리어하면 해제됩니다</span>
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
};
