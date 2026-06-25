import { useState } from 'react';
import type { RobotCategory, PartData } from './data/quizData';
import { Dashboard } from './components/Dashboard';
import { QuestHub } from './components/QuestHub';
import { QuizPanel } from './components/QuizPanel';
import { StudyPanel } from './components/StudyPanel';
import { sfx } from './utils/soundEffects';

type Screen = 'dashboard' | 'hub' | 'quiz' | 'study' | 'victory';

interface VictoryData {
  title: string;
  xpEarned: number;
  maxCombo: number;
  score: number;
  mode: 'pre' | 'post';
}

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpToNextLevel, setXpToNextLevel] = useState(100);
  const [badges, setBadges] = useState<Record<string, boolean>>({});
  const [preQuizCompleted, setPreQuizCompleted] = useState<Record<string, boolean>>({});
  const [isMuted, setIsMuted] = useState(false);

  // Nav selections
  const [selectedCategory, setSelectedCategory] = useState<RobotCategory | null>(null);
  const [selectedPart, setSelectedPart] = useState<PartData | null>(null);
  const [activeQuizMode, setActiveQuizMode] = useState<'pre' | 'post'>('pre');
  const [victoryData, setVictoryData] = useState<VictoryData | null>(null);
  const [showLevelUpAlert, setShowLevelUpAlert] = useState(false);

  const handleSelectCategory = (cat: RobotCategory) => {
    setSelectedCategory(cat);
    setScreen('hub');
  };

  const handleSelectPart = (part: PartData, mode: 'pre' | 'study' | 'post') => {
    setSelectedPart(part);
    if (mode === 'study') {
      setScreen('study');
    } else {
      setActiveQuizMode(mode);
      setScreen('quiz');
    }
  };

  const addXp = (amount: number) => {
    let nextXp = xp + amount;
    let nextLevel = level;
    let nextXpNeeded = xpToNextLevel;

    if (nextXp >= nextXpNeeded) {
      nextXp -= nextXpNeeded;
      nextLevel += 1;
      nextXpNeeded = Math.floor(nextXpNeeded * 1.5);
      
      // Level Up!
      sfx.playLevelUp();
      setShowLevelUpAlert(true);
      setTimeout(() => {
        setShowLevelUpAlert(false);
      }, 3500);
    }
    setXp(nextXp);
    setLevel(nextLevel);
    setXpToNextLevel(nextXpNeeded);
  };

  const handleQuizComplete = (score: number, maxCombo: number) => {
    if (!selectedCategory || !selectedPart) return;

    const xpGained = activeQuizMode === 'pre' ? 25 : 60;
    
    // Save completion state
    const partKey = `${selectedCategory.id}-${selectedPart.id}`;
    if (activeQuizMode === 'pre') {
      setPreQuizCompleted(prev => ({ ...prev, [partKey]: true }));
    } else {
      setBadges(prev => ({ ...prev, [partKey]: true }));
    }

    addXp(xpGained);
    sfx.playVictory();

    setVictoryData({
      title: `${selectedCategory.name} - ${selectedPart.title}`,
      xpEarned: xpGained,
      maxCombo,
      score,
      mode: activeQuizMode
    });
    setScreen('victory');
  };

  const handleCloseVictory = () => {
    sfx.playClick();
    setScreen('hub');
  };

  const handleStartPostQuizFromStudy = () => {
    if (!selectedPart) return;
    setActiveQuizMode('post');
    setScreen('quiz');
  };

  return (
    <div className="app-shell">
      {showLevelUpAlert && (
        <div className="level-up-overlay slide-up-anim">
          <div className="level-up-alert card-glow">
            <span className="lvl-alert-emoji">🎉 LEVEL UP! 🎉</span>
            <h2>축하합니다! 레벨 {level}에 도달했습니다!</h2>
            <p>당신의 돌봄 로봇 케어 숙련도가 한층 상승하였습니다.</p>
          </div>
        </div>
      )}

      {screen === 'dashboard' && (
        <Dashboard
          level={level}
          xp={xp}
          xpToNextLevel={xpToNextLevel}
          badges={badges}
          onSelectCategory={handleSelectCategory}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(!isMuted)}
        />
      )}

      {screen === 'hub' && selectedCategory && (
        <QuestHub
          category={selectedCategory}
          badges={badges}
          preQuizCompleted={preQuizCompleted}
          onBack={() => setScreen('dashboard')}
          onSelectPart={handleSelectPart}
        />
      )}

      {screen === 'study' && selectedPart && (
        <StudyPanel
          part={selectedPart}
          onBack={() => setScreen('hub')}
          onStartPostQuiz={handleStartPostQuizFromStudy}
        />
      )}

      {screen === 'quiz' && selectedPart && (
        <QuizPanel
          title={selectedPart.title}
          questions={activeQuizMode === 'pre' ? selectedPart.preQuiz : selectedPart.postQuiz}
          mode={activeQuizMode}
          onComplete={handleQuizComplete}
          onCancel={() => setScreen('hub')}
        />
      )}

      {screen === 'victory' && victoryData && (
        <div className="quiz-result-panel card-glow text-center slide-up-anim">
          <span className="victory-emoji">🏆</span>
          <h2 className="result-title text-green">STAGE CLEAR</h2>
          <p className="result-subtitle">{victoryData.title} 완료!</p>

          <div className="score-summary-grid">
            <div className="summary-item">
              <span className="summary-lbl">EXP 획득</span>
              <span className="summary-val">+{victoryData.xpEarned} XP</span>
            </div>
            <div className="summary-item">
              <span className="summary-lbl">최대 콤보</span>
              <span className="summary-val">🔥 {victoryData.maxCombo} Combo</span>
            </div>
          </div>

          <p className="exp-text">
            {victoryData.mode === 'pre'
              ? '사전 퀴즈를 통과하셨습니다! 이제 학습 카드를 보며 본 과정을 익힐 준비가 완료되었습니다.'
              : '사후 테스트에 합격하여 명예 훈장을 획득하셨습니다! 다음 스테이지가 잠금 해제됩니다.'}
          </p>

          <button className="primary-btn" onClick={handleCloseVictory}>
            {victoryData.mode === 'pre' ? '학습하러 가기' : '퀘스트 목록으로'}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
