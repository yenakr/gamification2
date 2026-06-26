import { useState, useEffect } from 'react';
import type { RobotCategory, PartData } from './data/quizData';
import { Dashboard } from './components/Dashboard';
import { QuestHub } from './components/QuestHub';
import { QuizPanel } from './components/QuizPanel';
import { StudyPanel } from './components/StudyPanel';
import { LoginScreen } from './components/LoginScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { ProfileModal } from './components/ProfileModal';
import { CertificateGenerator } from './utils/CertificateGenerator';
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

  // Profile and Activity state
  const [profile, setProfile] = useState<{ name: string; phone: string; careRobots: string[] } | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);

  // Nav selections
  const [selectedCategory, setSelectedCategory] = useState<RobotCategory | null>(null);
  const [selectedPart, setSelectedPart] = useState<PartData | null>(null);
  const [activeQuizMode, setActiveQuizMode] = useState<'pre' | 'post'>('pre');
  const [victoryData, setVictoryData] = useState<VictoryData | null>(null);
  const [showLevelUpAlert, setShowLevelUpAlert] = useState(false);

  // Load progress and profile when user changes/logs in
  useEffect(() => {
    if (token && user && user.role === 'user') {
      loadProgressFromServer(token);
      loadProfileFromServer(token);
      loadActivitiesFromServer(token);
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

  const loadProfileFromServer = async (authToken: string) => {
    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        // Force registration if name or phone is empty
        if (!data.name || !data.phone) {
          setShowProfileModal(true);
        }
      }
    } catch (err) {
      console.error('프로필을 불러오는 데 실패했습니다:', err);
    }
  };

  const loadActivitiesFromServer = async (authToken: string) => {
    try {
      const response = await fetch('/api/progress/activity', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (err) {
      console.error('활동 내역을 불러오는 데 실패했습니다:', err);
    }
  };

  const handleSaveProfile = async (name: string, phone: string, careRobots: string[]) => {
    if (!user) return;
    if (user.role === 'guest') {
      setProfile({ name, phone, careRobots });
      setShowProfileModal(false);
      return;
    }

    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, phone, careRobots })
      });
      if (response.ok) {
        setProfile({ name, phone, careRobots });
        setShowProfileModal(false);
      } else {
        alert('프로필을 저장하는 데 실패했습니다.');
      }
    } catch (err) {
      console.error('프로필 저장 중 에러:', err);
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

  const handleGuestLogin = () => {
    setToken('guest');
    setUser({
      id: 0,
      username: '게스트',
      role: 'guest'
    });
    setScreen('dashboard');
    // For guest, show profile creation on login
    setShowProfileModal(true);
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
    setProfile(null);
    setActivities([]);
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

    // Save activity log to server
    if (user && user.role === 'user' && token) {
      fetch('/api/progress/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          categoryId: selectedCategory.id,
          categoryName: selectedCategory.name,
          partId: selectedPart.id,
          partTitle: selectedPart.title,
          quizType: activeQuizMode,
          score
        })
      }).then(() => loadActivitiesFromServer(token));
    } else if (user && user.role === 'guest') {
      // Add local guest log
      const newAct = {
        categoryName: selectedCategory.name,
        partTitle: selectedPart.title,
        quizType: activeQuizMode,
        score,
        completedAt: new Date().toISOString()
      };
      setActivities(prev => [newAct, ...prev].slice(0, 10));
    }

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
    return <LoginScreen onLoginSuccess={handleLoginSuccess} onGuestLogin={handleGuestLogin} />;
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
      {/* Profile Modal */}
      {showProfileModal && (
        <ProfileModal
          initialName={profile?.name || ''}
          initialPhone={profile?.phone || ''}
          initialRobots={profile?.careRobots || []}
          onSave={handleSaveProfile}
          isMandatory={user.role !== 'guest' && (!profile?.name || !profile?.phone)}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* User top status bar with signout */}
      <div className="admin-nav-bar" style={{ marginTop: '10px' }}>
        <div className="admin-nav-left">
          <span style={{ fontSize: '1.2rem' }}>🎓</span>
          <span style={{ fontWeight: 700 }}>
            {user.role === 'guest' 
              ? `${profile?.name || '게스트'} 님 반갑습니다! (학습 정보가 저장되지 않습니다)` 
              : `${profile?.name || user.username} 님 반갑습니다!`}
          </span>
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
          profile={profile}
          onEditProfile={() => setShowProfileModal(true)}
          activities={activities}
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

      {screen === 'victory' && victoryData && selectedCategory && selectedPart && (
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

          {victoryData.mode === 'post' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '20px auto', maxWidth: '320px' }}>
              <button 
                className="secondary-btn" 
                onClick={() => {
                  CertificateGenerator.downloadImage(
                    profile?.name || user.username,
                    `${selectedCategory.name} - ${selectedPart.title}`,
                    victoryData.score,
                    victoryData.maxCombo
                  );
                }}
              >
                📥 이수증 이미지(PNG) 저장
              </button>
              <button 
                className="secondary-btn" 
                onClick={() => {
                  CertificateGenerator.printPdf(
                    profile?.name || user.username,
                    `${selectedCategory.name} - ${selectedPart.title}`,
                    victoryData.score,
                    victoryData.maxCombo
                  );
                }}
              >
                🖨️ 이수증 PDF로 인쇄/저장
              </button>
            </div>
          )}

          <button className="primary-btn" onClick={handleCloseVictory} style={{ width: '100%', marginTop: '10px' }}>
            {victoryData.mode === 'pre' ? '학습 가이드 보기' : '목록으로'}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
