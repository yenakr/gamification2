import React, { useState } from 'react';
import type { PartData } from '../data/quizData';
import { sfx } from '../utils/soundEffects';

interface StudyPanelProps {
  part: PartData;
  onBack: () => void;
  onStartPostQuiz: () => void;
}

export const StudyPanel: React.FC<StudyPanelProps> = ({
  part,
  onBack,
  onStartPostQuiz
}) => {
  const [slideIdx, setSlideIdx] = useState(0);
  const slides = part.studySlides;

  const handleNext = () => {
    sfx.playClick();
    if (slideIdx + 1 < slides.length) {
      setSlideIdx(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    sfx.playClick();
    if (slideIdx > 0) {
      setSlideIdx(prev => prev - 1);
    }
  };

  const isLastSlide = slideIdx === slides.length - 1;

  return (
    <div className="study-panel-container">
      <header className="study-header">
        <button 
          className="exit-btn" 
          onClick={() => {
            sfx.playClick();
            onBack();
          }}
        >
          ← 나가기
        </button>
        <span className="study-badge">📖 돌봄 교본 학습: {part.title}</span>
      </header>

      {/* Progress indicators dots */}
      <div className="study-dots-container">
        {slides.map((_, idx) => (
          <span 
            key={idx} 
            className={`study-dot ${idx === slideIdx ? 'active' : ''}`}
          />
        ))}
      </div>

      <div className="study-card card-glow slide-in-right">
        <div className="slide-num">CARD {slideIdx + 1} / {slides.length}</div>
        
        {/* Core illustration / animation box placeholder */}
        <div className="study-visual-box">
          <span className="visual-illustration animate-float">💡</span>
          <p className="visual-caption">돌봄 마스터 가이드</p>
        </div>

        <p className="study-text">{slides[slideIdx]}</p>

        <div className="slide-nav-buttons">
          <button 
            className="secondary-btn" 
            disabled={slideIdx === 0} 
            onClick={handlePrev}
          >
            이전 카드
          </button>

          {isLastSlide ? (
            <button 
              className="primary-btn pulse-anim" 
              onClick={() => {
                sfx.playVictory();
                onStartPostQuiz();
              }}
            >
              🔥 최종 테스트 도전!
            </button>
          ) : (
            <button 
              className="primary-btn" 
              onClick={handleNext}
            >
              다음 카드 →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
