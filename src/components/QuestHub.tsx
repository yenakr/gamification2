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
          ← 목록으로 돌아가기
        </button>
        <div className="category-header-info">
          <span className="cat-icon-large">{category.icon}</span>
          <div>
            <h1 className="hub-title">{category.name}</h1>
          </div>
        </div>
      </header>

      <main className="quest-list">
        {category.parts.map((part) => {
          const hasPreQuizDone = !!preQuizCompleted[`${category.id}-${part.id}`];
          const hasPostQuizDone = !!badges[`${category.id}-${part.id}`];

          // 임시 검토를 위해 사전 퀴즈 완료 여부 상관없이 항상 잠금 해제 (나중에 복구 시 false로 변경 가능)
          const BYPASS_PRE_QUIZ_REQUIREMENT = true;
          const isStudyUnlocked = BYPASS_PRE_QUIZ_REQUIREMENT || hasPreQuizDone;
          const isPostQuizUnlocked = BYPASS_PRE_QUIZ_REQUIREMENT || hasPreQuizDone;

          return (
            <div 
              key={part.id} 
              className={`quest-row unlocked ${hasPostQuizDone ? 'completed' : ''}`}
            >
              <div className="quest-meta">
                <div className="quest-number">Part 0{part.id}</div>
                <h3 className="quest-title">{part.title}</h3>
              </div>

              <div className="quest-actions">
                {/* Step 1: Pre-Quiz */}
                <button 
                  className={`action-chip ${hasPreQuizDone ? 'done' : 'pending'}`}
                  onClick={() => handleSelect(part, 'pre', false)}
                >
                  {hasPreQuizDone ? '✅ 사전 퀴즈 완료' : '🎯 사전 퀴즈'}
                </button>

                {/* Step 2: Study (unlocked after pre-quiz or bypassed) */}
                <button 
                  className={`action-chip ${isStudyUnlocked ? 'unlocked-study' : 'locked-study'}`}
                  disabled={!isStudyUnlocked}
                  onClick={() => handleSelect(part, 'study', !isStudyUnlocked)}
                >
                  📖 학습하기
                </button>

                {/* Step 3: Post-Quiz (unlocked after pre-quiz or bypassed, badges show when finished) */}
                <button 
                  className={`action-chip ${hasPostQuizDone ? 'victory-badge' : isPostQuizUnlocked ? 'unlocked-post' : 'locked-post'}`}
                  disabled={!isPostQuizUnlocked}
                  onClick={() => handleSelect(part, 'post', !isPostQuizUnlocked)}
                >
                  {hasPostQuizDone ? '🏆 평가 퀴즈 완료!' : '🔥 평가 퀴즈 도전'}
                </button>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
};
