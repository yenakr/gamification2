import React, { useState } from 'react';

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: { id: number; username: string; role: string }) => void;
  onGuestLogin: () => void;
}

export function LoginScreen({ onLoginSuccess, onGuestLogin }: LoginScreenProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    if (!isLoginMode && password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '에러가 발생했습니다.');
      }

      if (isLoginMode) {
        onLoginSuccess(data.token, data.user);
      } else {
        // 회원가입 성공 시 바로 로그인 모드로 전환
        setIsLoginMode(true);
        setPassword('');
        setConfirmPassword('');
        setError('');
        alert('회원가입이 완료되었습니다. 로그인해주세요!');
      }
    } catch (err: any) {
      setError(err.message || '서버와의 통신에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card card-glow slide-up-anim">
        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>🤖</span>
        <h2 className="auth-title">돌봄 로봇 학습 센터</h2>
        <p className="auth-subtitle">
          {isLoginMode ? '계정에 로그인하여 학습 진행 상황을 연동하세요.' : '새 계정을 만들고 학습을 시작하세요.'}
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">아이디</label>
            <input
              type="text"
              id="username"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디 입력"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              disabled={isLoading}
              required
            />
          </div>

          {!isLoginMode && (
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">비밀번호 확인</label>
              <input
                type="password"
                id="confirmPassword"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 재입력"
                disabled={isLoading}
                required
              />
            </div>
          )}

          <button type="submit" className="primary-btn auth-submit-btn" disabled={isLoading}>
            {isLoading ? '처리 중...' : isLoginMode ? '로그인' : '회원가입'}
          </button>
        </form>

        <button
          type="button"
          className="secondary-btn"
          style={{ width: '100%', marginBottom: '24px', borderRadius: '30px' }}
          onClick={onGuestLogin}
          disabled={isLoading}
        >
          로그인 없이 학습하기 (저장 안 됨)
        </button>

        <div className="auth-toggle-text">
          {isLoginMode ? '처음이신가요?' : '이미 계정이 있으신가요?'}
          <button
            type="button"
            className="auth-toggle-link"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError('');
            }}
            disabled={isLoading}
          >
            {isLoginMode ? '회원가입하기' : '로그인하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
