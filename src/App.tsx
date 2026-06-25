import { useState, useEffect } from 'react';
import type { RobotCategory, PartData } from './data/quizData';
import { Dashboard } from './components/Dashboard';
import { QuestHub } from './components/QuestHub';
import { QuizPanel } from './components/QuizPanel';
import { StudyPanel } from './components/StudyPanel';
import { LoginScreen } from './components/LoginScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { sfx } from './utils/soundEffects';

type Screen = 'dashboard' | 'hub' | 'quiz' | 'study' | 'victory';

interface VictoryData {
  title: string;
  xpEarned: number;
  maxCombo: number;
  score: number;
  mode: 'pre' | 'post';
}

interface UserAuth {
  id: number;
  username: string;
  role: string;
}

function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<UserAuth | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

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

  // Load progress when user changes/logs in
  useEffect(() => {
    if (token && user && user.role === 'user') {
      loadProgressFromServer(token);
    }
  }, [token, user]);

  const loadProgressFromServer = async (authToken: string) => {
    try {
      const response = await fetch('/api/progress/load', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLevel(data.level || 1);
        setXp(data.xp || 0);
        setXpToNextLevel(data.xpToNextLevel || 100);
        setBadges(data.badges || {});
        setPreQuizCompleted(data.preQuizCompleted || {});
      }
    } catch (err) {
      console.error('진행 상황을 불러오는 데 실패했습니다:', err);
    }
  };

  const saveProgressToServer = async (
    currentLvl: number,
    currentXp: number,
    currentXpMax: number,
    currentBadges: Record<string, boolean>,
    currentPreQuiz: Record<string, boolean>
  ) => {
    if (!token || !user || user.role !== 'user') return;

    try {
      await fetch('/api/progress/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          level: currentLvl,
          xp: currentXp,
          xpToNextLevel: currentXpMax,
          badges: currentBadges,
          preQuizCompleted: currentPreQuiz
        })
      });
    } catch (err) {
      console.error('진행 상황을 저장하는 데 실패했습니다:', err);
    }
  };

  const handleLoginSuccess = (newToken: string, loggedUser: UserAuth) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(loggedUser));
    setToken(newToken);
    setUser(loggedUser);
    setScreen('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setScreen('dashboard');
    setLevel(1);
    setXp(0);
    setXpToNextLevel(100);
    setBadges({});
    setPreQuizCompleted({});
  };

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

  const addXp = (amount: number, updatedBadges?: Record<string, boolean>, updatedPreQuiz?: Record<string, boolean>) => {
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

    // Save with latest values
    saveProgressToServer(
      nextLevel,
      nextXp,
      nextXpNeeded,
      updatedBadges || badges,
      updatedPreQuiz || preQuizCompleted
    );
  };

  const handleQuizComplete = (score: number, maxCombo: number) => {
    if (!selectedCategory || !selectedPart) return;

    const xpGained = activeQuizMode === 'pre' ? 25 : 60;
    
    // Save completion state
    const partKey = `${selectedCategory.id}-${selectedPart.id}`;
    let nextPreQuiz = { ...preQuizCompleted };
    let nextBadges = { ...badges };

    if (activeQuizMode === 'pre') {
      nextPreQuiz[partKey] = true;
      setPreQuizCompleted(nextPreQuiz);
    } else {
      nextBadges[partKey] = true;
      setBadges(nextBadges);
    }

    addXp(xpGained, nextBadges, nextPreQuiz);
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

  // If not logged in, show login screen
  if (!token || !user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // If admin, show admin dashboard
  if (user.role === 'admin') {
    return (
      <div className="app-shell" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <AdminDashboard token={token} onLogout={handleLogout} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* User top status bar with signout */}
      <div className="admin-nav-bar" style={{ marginTop: '10px' }}>
        <div className="admin-nav-left">
          <span style={{ fontSize: '1.2rem' }}>🎓</span>
          <span style={{ fontWeight: 700 }}>{user.username} 님 반갑습니다!</span>
        </div>
        <button className="secondary-btn" onClick={handleLogout} style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
          로그아웃
        </button>
      </div>

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
          <h2 className="result-title text-green">퀴즈 완료</h2>
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
              ? '사전 퀴즈를 완료하셨습니다! 학습 가이드를 통해 본 과정을 익혀보세요.'
              : '평가 퀴즈를 성공적으로 완료하여 명예 훈장을 획득하셨습니다!'}
          </p>

          <button className="primary-btn" onClick={handleCloseVictory}>
            {victoryData.mode === 'pre' ? '학습 가이드 보기' : '목록으로'}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
