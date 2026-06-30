import React, { useState, useEffect } from 'react';
import type { PartData } from '../data/quizData';
import { sfx } from '../utils/soundEffects';

interface StudyPanelProps {
  part: PartData;
  categoryId: string;
  categoryName: string;
  onBack: () => void;
  onStartPostQuiz: () => void;
}

interface PageData {
  title: string;
  paragraphs: string[];
  level: number; // 5 = ##### 큰 제목, 6 = ###### 소제목
  children?: { title: string; pageIndex: number }[]; // level-5 페이지의 하위 소제목
}

const categoryFileMapping: Record<string, string> = {
  transfer: '01_transfer.md',
  excretion: '02_toilet.md',
  meal: '03_feeding.md',
  posture: '04_position.md',
  communication: '05_communication.md'
};

export const StudyPanel: React.FC<StudyPanelProps> = ({
  part,
  categoryId,
  categoryName,
  onBack,
  onStartPostQuiz
}) => {
  const [pages, setPages] = useState<PageData[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMarkdownContent();
  }, [part.id, categoryId]);

  const loadMarkdownContent = async () => {
    try {
      setLoading(true);
      setError('');
      setCurrentPageIndex(0);

      const fileName = categoryFileMapping[categoryId];
      if (!fileName) {
        throw new Error(`'${categoryName}' 카테고리의 학습용 MD 파일 매핑이 없습니다.`);
      }
      
      const response = await fetch(`/material/${fileName}`);
      if (!response.ok) {
        throw new Error(`학습용 MD 파일(${fileName})을 불러오지 못했습니다.`);
      }

      const text = await response.text();
      const parsedPages = parsePartFromMarkdown(text, part.id);
      
      if (parsedPages.length === 0) {
        throw new Error('이 파트의 학습 콘텐츠를 파싱하는 데 실패했습니다.');
      }

      setPages(parsedPages);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '콘텐츠 로딩 오류');
      // Fallback to static slides if md loading fails
      setPages(part.studySlides.map((slide, idx) => ({
        title: `${part.title} - 슬라이드 ${idx + 1}`,
        paragraphs: slide.split('\n'),
        level: 5
      })));
    } finally {
      setLoading(false);
    }
  };

  const cleanTitle = (title: string) => {
    // "1. 제목", "1.2 제목", "1.2. 제목" 등에서 앞의 번호+점 제거
    return title.replace(/^[0-9]+(\.[0-9]+)*\.?\s*/, '').trim();
  };


  const parsePartFromMarkdown = (text: string, partId: number): PageData[] => {
    // 1. Find all Part headers: ### Part Ⅰ. [Title]
    const partHeaderRegex = /###\s+Part\s+([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+)\.\s*([^\n]+)/g;
    const headers: { index: number; title: string; length: number }[] = [];
    let match;
    
    while ((match = partHeaderRegex.exec(text)) !== null) {
      headers.push({
        index: match.index,
        title: match[2].trim(),
        length: match[0].length
      });
    }

    if (headers.length === 0) return [];

    // Find start and end indices of target Part
    const targetIdx = partId - 1; // 1-indexed partId to 0-indexed array
    if (targetIdx < 0 || targetIdx >= headers.length) return [];

    const startIdx = headers[targetIdx].index + headers[targetIdx].length;
    const endIdx = headers[targetIdx + 1] ? headers[targetIdx + 1].index : text.length;
    
    const partContent = text.slice(startIdx, endIdx);

    // 2. Paginate content by sub-headers: ####, #####, ######
    const lines = partContent.split('\n');
    const parsed: PageData[] = [];
    let currentTitle = '학습 개요';
    let currentLevel = 5;
    let currentParagraphs: string[] = [];
    let hasStarted = false; // 첫 헤더 이전에는 push 안 함

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Stop parsing if we reach summary/wrap-up section
      if (line.startsWith('#### 정리하기')) {
        break;
      }

      // Match headers H4, H5, H6
      if (line.startsWith('#### ') || line.startsWith('##### ') || line.startsWith('###### ')) {
        const rawTitle = line.replace(/^#+\s*/, '').trim();

        // 이전 헤더가 있었으면 본문이 비어있어도 페이지로 등록 (큰 제목 누락 방지)
        if (hasStarted) {
          parsed.push({ title: cleanTitle(currentTitle), paragraphs: currentParagraphs, level: currentLevel });
          currentParagraphs = [];
        }

        if (rawTitle === '학습하기') {
          // '학습하기'는 투명 구분자로만 사용 — 페이지 생성 안 함
          hasStarted = false;
        } else {
          currentTitle = rawTitle;
          currentLevel = line.startsWith('###### ') ? 6 : 5;
          hasStarted = true;
        }
      } else if (line.startsWith('> ')) {
        // Blockquote: could be caption like "> [그림 1] 설명" or image "![alt](src)"
        currentParagraphs.push(line); // keep with '> ' prefix for rendering
      } else {
        currentParagraphs.push(line);
      }
    }

    if (hasStarted) {
      parsed.push({ title: cleanTitle(currentTitle), paragraphs: currentParagraphs, level: currentLevel });
    }

    // level-5 페이지에 하위 level-6 페이지들을 children으로 연결
    for (let i = 0; i < parsed.length; i++) {
      if (parsed[i].level === 5) {
        const children: { title: string; pageIndex: number }[] = [];
        for (let j = i + 1; j < parsed.length && parsed[j].level === 6; j++) {
          children.push({ title: parsed[j].title, pageIndex: j });
        }
        parsed[i].children = children;
      }
    }

    return parsed;
  };

  const handleNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      sfx.playClick();
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      sfx.playClick();
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const parseBoldText = (text: string) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <strong key={index} style={{ fontWeight: 700 }}>
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  const renderParagraph = (text: string, idx: number) => {
    // 0. Standalone bold line: **제목** (전체 줄이 **...**인 경우 → 섹션 소제목)
    const standaloneBold = text.match(/^\*\*([^*]+)\*\*$/);
    if (standaloneBold) {
      return (
        <div
          key={idx}
          style={{
            margin: '28px 0 10px 0',
            paddingLeft: '12px',
            borderLeft: '3px solid var(--color-primary)',
            fontSize: '1.55rem',
            fontWeight: 800,
            color: 'var(--color-primary)',
            lineHeight: 1.4
          }}
        >
          {standaloneBold[1]}
        </div>
      );
    }

    // 1. Markdown image: ![alt text](/images/...)
    const mdImageMatch = text.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (mdImageMatch) {
      const altText = mdImageMatch[1];
      const src = mdImageMatch[2];
      return (
        <figure key={idx} style={{ margin: '24px 0', textAlign: 'center' }}>
          <img
            src={src}
            alt={altText}
            style={{
              maxWidth: '100%',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              border: '1px solid var(--border-color)'
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              const sibling = e.currentTarget.nextElementSibling as HTMLElement;
              if (sibling) sibling.style.display = 'flex';
            }}
          />
          <div
            style={{
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '20px',
              background: 'var(--bg-secondary)',
              borderRadius: '12px',
              border: '1px dashed var(--border-color)',
              color: 'var(--text-muted)',
              fontSize: '0.9rem'
            }}
          >
            <span>🖼️</span><span>{altText} (이미지 로드 실패)</span>
          </div>
          {altText && (
            <figcaption style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {altText}
            </figcaption>
          )}
        </figure>
      );
    }

    // 2. Blockquote caption line: "> [그림 N] 설명" or "> [표 N] 설명"
    if (text.startsWith('> ')) {
      const captionContent = text.slice(2).trim();
      // If it's a markdown image inside blockquote
      const innerImgMatch = captionContent.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (innerImgMatch) {
        return renderParagraph(captionContent, idx);
      }
      // Otherwise render as styled caption label
      const isFig = captionContent.startsWith('[그림') || captionContent.startsWith('[Figure');
      const isTable = captionContent.startsWith('[표') || captionContent.startsWith('[Table');
      return (
        <div
          key={idx}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            margin: '8px 0 4px 0',
            padding: '6px 14px',
            borderRadius: '20px',
            background: isFig
              ? 'linear-gradient(90deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08))'
              : isTable
              ? 'linear-gradient(90deg, rgba(16,185,129,0.12), rgba(5,150,105,0.08))'
              : 'var(--bg-secondary)',
            border: `1px solid ${isFig ? 'rgba(99,102,241,0.3)' : isTable ? 'rgba(16,185,129,0.3)' : 'var(--border-color)'}`,
            fontSize: '0.85rem',
            fontWeight: 700,
            color: isFig ? 'rgba(139,92,246,1)' : isTable ? 'rgba(16,185,129,1)' : 'var(--text-muted)'
          }}
        >
          <span>{isFig ? '🖼️' : isTable ? '📋' : '📌'}</span>
          <span>{captionContent}</span>
        </div>
      );
    }

    // 3. Legacy image/fig/table placeholder (e.g. transfer_table1, transfer_fig2)
    const isImagePlaceholder = /^[a-zA-Z0-9]+_(table|fig|fig_table)[0-9]+$/i.test(text.trim());
    if (isImagePlaceholder) {
      const placeholderName = text.trim();
      let sourceText = '출처: 국립재활원 돌봄로봇 교육훈련 교안 및 한국보건산업진흥원 가이드라인';
      if (placeholderName.includes('toilet')) {
        sourceText = '출처: 배뇨돌봄로봇 안전 가이드 및 국립재활원 내부 교육 자료';
      } else if (placeholderName.includes('transfer')) {
        sourceText = '출처: 이승보조기술 적용 지침 및 근골격계 안전 보건공단 기술자료';
      } else if (placeholderName.includes('feeding')) {
        sourceText = '출처: 식사보조기기 임상 실무 지침 및 보건복지부 돌봄기술 가이드라인';
      } else if (placeholderName.includes('position')) {
        sourceText = '출처: 자세변경로봇 활용 기술 표준 및 욕창 예방 간호 가이드라인';
      } else if (placeholderName.includes('communication')) {
        sourceText = '출처: 정서지능형 커뮤니케이션 로봇 서비스 표준 가이드라인';
      }

      return (
        <div key={idx} className="study-image-placeholder animate-float" style={{ margin: '20px 0', padding: '24px' }}>
          <span className="placeholder-icon">📊</span>
          <span className="placeholder-name">{placeholderName}</span>
          <span className="placeholder-desc">도표/일러스트 이미지 리소스 준비 중</span>
          <span className="placeholder-source" style={{ display: 'block', marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
            {sourceText}
          </span>
        </div>
      );
    }

    // 4. List item
    if (text.startsWith('- ') || text.startsWith('* ')) {
      return (
        <li key={idx} className="study-list-item" style={{ marginLeft: '16px', marginBottom: '16px', lineHeight: '1.7', fontSize: '1.7rem' }}>
          {parseBoldText(text.slice(2))}
        </li>
      );
    }

    return (
      <p key={idx} className="study-text-para" style={{ marginBottom: '32px', lineHeight: '1.7', fontSize: '1.785rem', textAlign: 'justify' }}>
        {parseBoldText(text)}
      </p>
    );
  };

  return (
    <div className="study-panel-container" style={{ width: '95vw', maxWidth: '1000px', margin: '0 auto', minHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
      <header className="study-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <button 
          className="exit-btn" 
          onClick={() => {
            sfx.playClick();
            onBack();
          }}
          style={{ padding: '8px 16px', borderRadius: '15px' }}
        >
          ← 목록으로
        </button>
        <span className="study-badge" style={{ fontSize: '0.9rem', fontWeight: 700 }}>
          📖 {categoryName} - Part {part.id}. {part.title}
        </span>
      </header>

      {loading ? (
        <div className="card-glow text-center" style={{ flex: 1, padding: '100px 20px', fontSize: '1.1rem', color: 'var(--text-muted)' }}>
          📖 학습 자료 교안 로딩 중...
        </div>
      ) : error ? (
        <div className="card-glow text-center" style={{ flex: 1, padding: '100px 20px', fontSize: '1.1rem', color: '#ef4444' }}>
          ⚠️ {error} <br />
          <button className="primary-btn" onClick={loadMarkdownContent} style={{ marginTop: '20px' }}>다시 시도</button>
        </div>
      ) : (
        <div className="study-book-frame card-glow" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
          {/* Progress bar */}
          <div className="progress-bar-container" style={{ height: '6px', borderRadius: '0' }}>
            <div className="progress-bar-fill" style={{ width: `${((currentPageIndex + 1) / pages.length) * 100}%` }}></div>
          </div>

          {/* Book Content Area */}
          <div className="book-page-content" style={{ flex: 1, padding: '40px 30px', overflowY: 'auto' }}>
            {pages[currentPageIndex] && (
              <div className="slide-up-anim" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div className="book-section-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', borderBottom: '2px solid var(--border-color)', paddingBottom: '12px', marginBottom: '24px', gap: '14px' }}>
                  <h3 className="book-section-title" style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-primary)', textAlign: 'left', margin: 0 }}>
                    🔖 {pages[currentPageIndex].title}
                  </h3>
                  
                  {/* Quick Chapter Navigation Dropdown */}
                  <div className="chapter-nav-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <label htmlFor="chapter-select" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>이동:</label>
                    <select
                      id="chapter-select"
                      value={pages[currentPageIndex] && (pages[currentPageIndex].title === '학습목표' || pages[currentPageIndex].title === '학습내용') ? 'placeholder' : currentPageIndex}
                      onChange={(e) => {
                        if (e.target.value === 'placeholder') return;
                        sfx.playClick();
                        setCurrentPageIndex(Number(e.target.value));
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        fontFamily: 'var(--font-game)',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        flex: 1,
                        width: '100%'
                      }}
                    >
                      <option value="placeholder" disabled hidden>📖 학습 목차 선택 (이동하기)</option>
                      {pages.map((p, idx) => {
                        if (p.title === '학습목표' || p.title === '학습내용') return null;
                        const isBig = p.level === 5;
                        return (
                          <option key={idx} value={idx}>
                            {isBig ? `📌 ${p.title}` : `　　↳ ${p.title}`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
                
                <div className="book-paragraphs" style={{ color: 'var(--text-main)' }}>
                  {/* level-5 큰제목 페이지에는 소제목 카드 인덱스를 먼저 표시 */}
                  {pages[currentPageIndex].level === 5 && pages[currentPageIndex].children && pages[currentPageIndex].children!.length > 0 && (
                    <div style={{ marginBottom: '36px' }}>
                      <div style={{
                        fontSize: '0.9rem', fontWeight: 700,
                        color: 'var(--text-muted)',
                        marginBottom: '14px',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase'
                      }}>
                        📚 이 체터의 학습 내용
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {pages[currentPageIndex].children!.map((child, ci) => (
                          <button
                            key={child.pageIndex}
                            onClick={() => { sfx.playClick(); setCurrentPageIndex(child.pageIndex); }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '14px',
                              padding: '14px 20px',
                              borderRadius: '12px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-main)',
                              fontSize: '1.1rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                          >
                            <span style={{
                              minWidth: '28px', height: '28px',
                              borderRadius: '50%',
                              background: 'var(--color-primary)',
                              color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.85rem', fontWeight: 800, flexShrink: 0
                            }}>{ci + 1}</span>
                            <span>{child.title}</span>
                            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '1rem' }}>▶</span>
                          </button>
                        ))}
                      </div>
                      {pages[currentPageIndex].paragraphs.length > 0 && (
                        <hr style={{ margin: '28px 0', borderColor: 'var(--border-color)', opacity: 0.5 }} />
                      )}
                    </div>
                  )}
                  {pages[currentPageIndex].paragraphs.map((p, idx) => renderParagraph(p, idx))}
                </div>
              </div>
            )}
          </div>

          {/* Book Footer Controls */}
          <footer className="book-controls-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.01)' }}>
            <button 
              className="secondary-btn" 
              onClick={handlePrevPage} 
              disabled={currentPageIndex === 0}
              style={{ padding: '8px 20px', borderRadius: '20px', fontSize: '0.9rem' }}
            >
              ◀ 이전 페이지
            </button>

            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              페이지 {currentPageIndex + 1} / {pages.length}
            </span>

            {currentPageIndex === pages.length - 1 ? (
              <button 
                className="primary-btn pulse-anim" 
                onClick={() => {
                  sfx.playVictory();
                  onStartPostQuiz();
                }}
                style={{ padding: '8px 24px', borderRadius: '20px', fontSize: '0.9rem' }}
              >
                🔥 평가 퀴즈 도전!
              </button>
            ) : (
              <button 
                className="secondary-btn" 
                onClick={handleNextPage}
                style={{ padding: '8px 20px', borderRadius: '20px', fontSize: '0.9rem' }}
              >
                다음 페이지 ▶
              </button>
            )}
          </footer>
        </div>
      )}
    </div>
  );
};
