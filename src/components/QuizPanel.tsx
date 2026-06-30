import React, { useState } from 'react';
import type { Question } from '../data/quizData';
import { sfx } from '../utils/soundEffects';

interface QuizPanelProps {
  title: string;
  questions: Question[];
  mode: 'pre' | 'post';
  onComplete: (score: number, maxCombo: number) => void;
  onCancel: () => void;
}

export const QuizPanel: React.FC<QuizPanelProps> = ({
  title,
  questions,
  mode,
  onComplete,
  onCancel
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [hearts, setHearts] = useState(3);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [shakeScreen, setShakeScreen] = useState(false);

  if (!questions || questions.length === 0) {
    return (
      <div className="quiz-result-panel text-center card-glow">
        <h2 className="result-title text-red">퀴즈 없음</h2>
        <p className="result-subtitle">이 파트에는 진행할 {mode === 'pre' ? '사전' : '평가'} 퀴즈가 준비되어 있지 않습니다.</p>
        <div className="btn-group">
          <button className="primary-btn" onClick={onCancel}>돌아가기</button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];

  const handleOptionSelect = (optionIdx: number) => {
    if (isAnswered || isGameOver) return;
    setSelectedIdx(optionIdx);
    setIsAnswered(true);

    const isCorrect = optionIdx === currentQuestion.answerIndex;

    if (isCorrect) {
      sfx.playCorrect();
      setCorrectCount(prev => prev + 1);
      setStreak(prev => {
        const next = prev + 1;
        if (next > maxStreak) setMaxStreak(next);
        return next;
      });
    } else {
      sfx.playWrong();
      setStreak(0);
      setHearts(prev => {
        const next = prev - 1;
        if (next <= 0) {
          setIsGameOver(true);
        }
        return next;
      });
      // trigger screen shake
      setShakeScreen(true);
      setTimeout(() => setShakeScreen(false), 500);
    }
  };

  const handleNext = () => {
    sfx.playClick();
    setSelectedIdx(null);
    setIsAnswered(false);

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(prev => prev + 1);
    } else {
      // Quiz finished successfully!
      const percentageScore = Math.round((correctCount / questions.length) * 100);
      onComplete(percentageScore, maxStreak);
    }
  };

  const handleRestart = () => {
    sfx.playClick();
    setCurrentIdx(0);
    setSelectedIdx(null);
    setIsAnswered(false);
    setHearts(3);
    setStreak(0);
    setMaxStreak(0);
    setCorrectCount(0);
    setIsGameOver(false);
  };

  if (isGameOver) {
    return (
      <div className="quiz-result-panel game-over-card text-center card-glow">
        <span className="game-over-emoji animate-bounce">😢</span>
        <h2 className="result-title text-red">퀴즈 실패</h2>
        <p className="result-subtitle">체력이 모두 소진되었습니다. 다시 한번 도전해 보세요!</p>
        <div className="btn-group">
          <button className="primary-btn" onClick={handleRestart}>다시 시작하기</button>
          <button className="secondary-btn" onClick={onCancel}>중단하고 나가기</button>
        </div>
      </div>
    );
  }

  const progressPercent = Math.floor(((currentIdx) / questions.length) * 100);

  return (
    <div className={`quiz-panel-container ${shakeScreen ? 'shake-anim' : ''}`}>
      <header className="quiz-header">
        <button 
          className="exit-btn" 
          onClick={() => {
            sfx.playClick();
            onCancel();
          }}
        >
          🚪 나가기
        </button>
        <span className="quiz-badge">{mode === 'pre' ? '🎯 사전 퀴즈' : '🔥 평가 퀴즈'} - {title}</span>
        
        {/* Hearts indicator */}
        <div className="hearts-track">
          {Array.from({ length: 3 }).map((_, idx) => (
            <span 
              key={idx} 
              className={`heart-icon ${idx < hearts ? 'alive' : 'dead'}`}
            >
              ❤️
            </span>
          ))}
        </div>
      </header>

      {/* Quiz Progress */}
      <div className="progress-bar-container mini">
        <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
      </div>

      <div className="quiz-body card-glow">
        {/* Question Counter & Combo */}
        <div className="quiz-stats-row">
          <span className="q-counter">문제 {currentIdx + 1} / {questions.length}</span>
          {streak > 1 && (
            <span className="combo-toast pulse-anim">🔥 {streak} COMBO!</span>
          )}
        </div>

        {/* Question Text */}
        <h2 className="question-text">{currentQuestion.question}</h2>

        {/* Options */}
        <div className={
          currentQuestion.options.length === 2 &&
          currentQuestion.options.includes('O') &&
          currentQuestion.options.includes('X')
            ? "options-list ox-layout"
            : "options-list"
        }>
          {currentQuestion.options.map((option, idx) => {
            let optionClass = '';
            if (isAnswered) {
              if (idx === currentQuestion.answerIndex) {
                optionClass = 'correct-opt';
              } else if (idx === selectedIdx) {
                optionClass = 'wrong-opt';
              } else {
                optionClass = 'disabled-opt';
              }
            } else {
              optionClass = 'interactive-opt';
            }

            const isOX = currentQuestion.options.length === 2 &&
                         currentQuestion.options.includes('O') &&
                         currentQuestion.options.includes('X');

            return (
              <button 
                key={idx}
                className={`option-btn ${optionClass} ${isOX ? 'ox-btn' : ''}`}
                disabled={isAnswered}
                onClick={() => handleOptionSelect(idx)}
              >
                {!isOX && <span className="option-num">{idx + 1}</span>}
                <span className="option-content">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback / Explanations */}
        {isAnswered && (
          <div className="explanation-box slide-up-anim">
            <h4 className={selectedIdx === currentQuestion.answerIndex ? 'text-green' : 'text-red'}>
              {selectedIdx === currentQuestion.answerIndex ? '🎉 정답입니다!' : '😢 틀렸습니다.'}
            </h4>
            <p className="exp-text">{currentQuestion.explanation}</p>
            <button className="primary-btn next-btn" onClick={handleNext}>
              {currentIdx + 1 === questions.length ? '결과 보기' : '다음 문제 →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
