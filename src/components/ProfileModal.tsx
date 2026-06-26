import React, { useState } from 'react';
import { quizData } from '../data/quizData';

interface ProfileModalProps {
  initialName?: string;
  initialPhone?: string;
  initialRobots?: string[];
  onSave: (name: string, phone: string, careRobots: string[]) => void;
  isMandatory: boolean;
  onClose?: () => void;
}

export function ProfileModal({
  initialName = '',
  initialPhone = '',
  initialRobots = [],
  onSave,
  isMandatory,
  onClose
}: ProfileModalProps) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [selectedRobots, setSelectedRobots] = useState<string[]>(initialRobots);
  const [error, setError] = useState('');

  const handleCheckboxChange = (robotId: string) => {
    if (selectedRobots.includes(robotId)) {
      setSelectedRobots(selectedRobots.filter(id => id !== robotId));
    } else {
      setSelectedRobots([...selectedRobots, robotId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('실명을 입력해주세요.');
      return;
    }

    if (!phone.trim()) {
      setError('연락처(전화번호)를 입력해주세요.');
      return;
    }

    onSave(name, phone, selectedRobots);
  };

  return (
    <div className="level-up-overlay slide-up-anim" style={{ zIndex: 1000 }}>
      <div className="level-up-alert card-glow" style={{ maxWidth: '500px', width: '90%', padding: '30px' }} onClick={(e) => e.stopPropagation()}>
        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '10px' }}>👤</span>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px' }}>학습자 프로필 등록</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
          학습 과정을 기록하고 관리자 확인을 위해 필요한 기본 정보를 입력해 주세요.
        </p>

        {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="form-group">
            <label className="form-label">이름 (실명)</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 홍길동"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">연락처 (전화번호)</label>
            <input
              type="tel"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="예: 010-1234-5678"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">주로 사용하는 돌봄로봇 (중복선택 가능)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '8px' }}>
              {quizData.map((robot) => (
                <label 
                  key={robot.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    fontSize: '0.9rem', 
                    cursor: 'pointer',
                    background: selectedRobots.includes(robot.id) ? 'rgba(124, 58, 237, 0.06)' : 'rgba(0, 0, 0, 0.02)',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: selectedRobots.includes(robot.id) ? '1px solid var(--color-primary)' : '1px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedRobots.includes(robot.id)}
                    onChange={() => handleCheckboxChange(robot.id)}
                    style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                  />
                  <span>{robot.icon} {robot.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            {!isMandatory && onClose && (
              <button type="button" className="secondary-btn" onClick={onClose} style={{ flex: 1, borderRadius: '30px' }}>
                취소
              </button>
            )}
            <button type="submit" className="primary-btn" style={{ flex: 2, borderRadius: '30px' }}>
              프로필 저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
