import React, { useState, useEffect } from 'react';
import { quizData, type PartData } from '../data/quizData';
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

const categoryWordMapping: Record<string, string> = {
  transfer: '이승',
  excretion: '배설',
  meal: '식사',
  posture: '자세',
  communication: '소통'
};

export const StudyPanel: React.FC<StudyPanelProps> = ({
  part,
  categoryId,
  categoryName,
  onBack,
  onStartPostQuiz
}) => {
  const [currentCategoryId, setCurrentCategoryId] = useState(categoryId);
  const [currentPart, setCurrentPart] = useState<PartData>(part);
  const [tempCategoryId, setTempCategoryId] = useState(categoryId);
  const [pages, setPages] = useState<PageData[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNavPopover, setShowNavPopover] = useState(false);

  useEffect(() => {
    loadMarkdownContent();
  }, [currentPart.id, currentCategoryId]);

  const loadMarkdownContent = async () => {
    try {
      setLoading(true);
      setError('');
      setCurrentPageIndex(0);

      const fileName = categoryFileMapping[currentCategoryId];
      const categoryObj = quizData.find(c => c.id === currentCategoryId);
      const categoryNameStr = categoryObj ? categoryObj.name : categoryName;
      
      if (!fileName) {
        throw new Error(`'${categoryNameStr}' 카테고리의 학습용 MD 파일 매핑이 없습니다.`);
      }
      
      const response = await fetch(`/material/${fileName}`);
      if (!response.ok) {
        throw new Error(`학습용 MD 파일(${fileName})을 불러오지 못했습니다.`);
      }

      const text = await response.text();
      const parsedPages = parsePartFromMarkdown(text, currentPart.id);
      
      if (parsedPages.length === 0) {
        throw new Error('이 파트의 학습 콘텐츠를 파싱하는 데 실패했습니다.');
      }

      setPages(parsedPages);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '콘텐츠 로딩 오류');
      // Fallback to static slides if md loading fails
      setPages(currentPart.studySlides.map((slide, idx) => ({
        title: `${currentPart.title} - 슬라이드 ${idx + 1}`,
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

    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) {
        i++;
        continue;
      }

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
      } else if (/^\s*\|/.test(line)) {
        // 표(Table) 구문 감지하여 한 덩어리로 묶음
        let tableBlock = '';
        while (i < lines.length && /^\s*\|/.test(lines[i])) {
          // 각 라인 끝에 붙어있을 수 있는 \r 문자나 공백 제거 후 결합
          tableBlock += lines[i].replace(/\r$/, '').trim() + '\n';
          i++;
        }
        currentParagraphs.push('__TABLE_BLOCK__' + tableBlock.trim());
        continue; // i++는 위 루프에서 이미 수행됨
      } else if (line.startsWith('[출처]') || line.startsWith('[출처:')) {
        let sourceBlock = line.replace(/\r$/, '').trim();
        while (i + 1 < lines.length) {
          const nextLineTrimmed = lines[i + 1].replace(/\r$/, '').trim();
          if (
            nextLineTrimmed === '' ||
            nextLineTrimmed.startsWith('[출처]') ||
            nextLineTrimmed.startsWith('[출처:') ||
            nextLineTrimmed.startsWith('#') ||
            nextLineTrimmed.startsWith('- ') ||
            nextLineTrimmed.startsWith('* ') ||
            nextLineTrimmed.startsWith('|') ||
            nextLineTrimmed.startsWith('!') ||
            nextLineTrimmed.startsWith('>')
          ) {
            break;
          }
          sourceBlock += ' ' + nextLineTrimmed;
          i++;
        }
        currentParagraphs.push('__SOURCE_BLOCK__' + sourceBlock);
      } else if (line.startsWith('> ')) {
        // Blockquote: could be caption like "> [그림 1] 설명" or image "![alt](src)"
        currentParagraphs.push(line); // keep with '> ' prefix for rendering
      } else {
        currentParagraphs.push(line);
      }
      i++;
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
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <strong key={index} style={{ color: 'var(--color-neon-cyan)', fontWeight: 800 }}>
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  const renderParagraph = (text: string, idx: number) => {
    // 000. Source Block rendering
    if (text.startsWith('__SOURCE_BLOCK__')) {
      const rawSource = text.slice(16).trim();
      
      let sourceText = rawSource;
      let sourceLink = '';
      
      const urlRegex = /(https?:\/\/[^\s\)]+|doi\.org\/[^\s\)]+)/i;
      const urlMatch = rawSource.match(urlRegex);
      
      if (urlMatch) {
        sourceLink = urlMatch[1];
        if (sourceLink.toLowerCase().startsWith('doi.org')) {
          sourceLink = 'https://' + sourceLink;
        }
        sourceText = rawSource.replace(urlRegex, '').trim();
        sourceText = sourceText.replace(/\(\s*\)/g, '').replace(/\[\s*\]/g, '').trim();
      }
      
      if (sourceText.startsWith('[출처]')) {
        sourceText = sourceText.replace(/^\[출처\]\s*/, '출처: ');
      } else if (sourceText.startsWith('[출처:')) {
        sourceText = sourceText.replace(/^\[출처:\s*([^\]]+)\]\s*/, '출처: $1 ');
      }
      
      if (sourceText.endsWith('from')) {
        sourceText = sourceText.slice(0, -4).trim();
      }
      sourceText = sourceText.replace(/,\s*$/, '').trim();

      return (
        <div key={idx} className="study-source-info" style={{ 
          fontSize: '0.85rem', 
          color: 'var(--text-muted)', 
          marginTop: '16px', 
          marginBottom: '8px', 
          textAlign: 'right',
          fontStyle: 'italic',
          wordBreak: 'break-all'
        }}>
          {sourceLink ? (
            <a 
              href={sourceLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: 'var(--color-neon-cyan)', textDecoration: 'underline', fontWeight: 600 }}
            >
              {sourceText} 🔗
            </a>
          ) : (
            <span>{sourceText}</span>
          )}
        </div>
      );
    }

    // 00. Table Block rendering
    if (text.startsWith('__TABLE_BLOCK__')) {
      const tableRaw = text.slice(15);
      const rows = tableRaw.split('\n').map(r => r.trim()).filter(r => r.length > 0);
      const filteredRows = rows.filter(r => !r.includes(':---') && !r.includes('---:'));
      
      if (filteredRows.length === 0) return null;

      const parseCols = (rowStr: string) => {
        let cols = rowStr.replace(/^\|/, '').replace(/\|$/, '').split('|');
        return cols.map(c => c.trim());
      };

      const headers = parseCols(filteredRows[0]);
      const bodyRows = filteredRows.slice(1).map(r => parseCols(r));

      return (
        <div key={idx} style={{ 
          overflowX: 'auto', 
          margin: '28px 0', 
          borderRadius: '16px', 
          border: '1px solid var(--border-color)', 
          boxShadow: '0 8px 24px rgba(0,0,0,0.04)' 
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.2rem', textAlign: 'left', fontFamily: 'var(--font-game)' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, var(--color-primary), #6366f1)', color: '#ffffff' }}>
                {headers.map((h, hi) => (
                  <th key={hi} style={{ padding: '18px 22px', fontWeight: 800 }}>
                    {parseBoldText(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} style={{ 
                  background: ri % 2 === 1 ? 'rgba(124, 58, 237, 0.02)' : 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  {row.map((col, ci) => (
                    <td key={ci} style={{ padding: '18px 22px', color: 'var(--text-main)', lineHeight: '1.6' }}>
                      {parseBoldText(col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

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
            fontSize: '1.85rem',
            fontWeight: 800,
            color: 'var(--color-primary)',
            lineHeight: 1.4
          }}
        >
          {standaloneBold[1]}
        </div>
      );
    }

    // 0000. '기타' 임시 캡션 텍스트는 화면 노출을 생략함
    const cleanText = text.trim();
    if (/^[>#\s]*\[기타\s*\d+\]/i.test(cleanText)) {
      return null;
    }

    // 1. Markdown image: ![alt text](/images/...)
    if (cleanText.startsWith('![') && cleanText.endsWith(')')) {
      const lastOpenParen = cleanText.lastIndexOf('(');
      if (lastOpenParen !== -1) {
        const altPart = cleanText.slice(0, lastOpenParen).trim();
        const srcPart = cleanText.slice(lastOpenParen + 1, cleanText.length - 1).trim();
        
        let altText = altPart;
        if (altPart.startsWith('![') && altPart.endsWith(']')) {
          altText = altPart.slice(2, altPart.length - 1).trim();
          if (altText.startsWith('[') && altText.endsWith(']')) {
            altText = altText.slice(1, altText.length - 1).trim();
          }
        }

        // 기타(_other) 설명서 이미지 여부 감지
        const isOtherImage = srcPart.includes('_other') || altText.startsWith('기타') || altText.startsWith('[기타');

        return (
          <figure key={idx} style={{ 
            margin: isOtherImage ? '18px 0' : '24px auto', 
            textAlign: 'center', 
            maxWidth: isOtherImage ? '100%' : '75%' 
          }}>
            <img
              src={srcPart}
              alt={altText}
              style={{
                maxWidth: '100%',
                width: isOtherImage ? '100%' : 'auto',
                maxHeight: isOtherImage ? 'none' : '360px',
                objectFit: 'contain',
                borderRadius: isOtherImage ? '8px' : '12px',
                boxShadow: isOtherImage ? '0 2px 12px rgba(0,0,0,0.06)' : '0 4px 20px rgba(0,0,0,0.12)',
                border: '1px solid var(--border-color)',
                display: 'block',
                margin: '0 auto'
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                if (sibling) sibling.style.display = 'flex';
              }}
            />
            <div
              style={{
                display: 'none',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '24px',
                background: 'rgba(239, 68, 68, 0.05)',
                borderRadius: '12px',
                border: '1px dashed #ef4444',
                color: '#ef4444',
                fontSize: '0.95rem'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <span style={{ fontWeight: 700 }}>이미지 리소스 로드 실패</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                설정 경로: {srcPart}
              </span>
            </div>
            {/* 기타 설명서 이미지의 캡션(예: [기타 1])은 화면에 노출하지 않음 */}
            {!isOtherImage && altText && (
              <figcaption style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {altText}
              </figcaption>
            )}
          </figure>
        );
      }
    }

    // 2. Blockquote caption line: "> [그림 N] 설명" or "> [표 N] 설명"
    if (text.startsWith('> ')) {
      const captionContent = text.slice(2).trim();
      // If it's a markdown image inside blockquote (e.g., > ![[그림 8] ...](/images/...))
      if (captionContent.startsWith('![') && captionContent.endsWith(')')) {
        return renderParagraph(captionContent, idx);
      }
      // 중복 노출을 막기 위해 일반 텍스트 캡션 뱃지는 렌더링하지 않음
      return null;
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
        <li key={idx} className="study-list-item" style={{ marginLeft: '16px', marginBottom: '16px', lineHeight: '1.7', fontSize: '1.3rem' }}>
          {parseBoldText(text.slice(2))}
        </li>
      );
    }

    return (
      <p key={idx} className="study-text-para" style={{ marginBottom: '32px', lineHeight: '1.7', fontSize: '1.35rem', textAlign: 'justify' }}>
        {parseBoldText(text)}
      </p>
    );
  };

  return (
    <div className="study-panel-container" style={{ width: '95vw', maxWidth: '1000px', margin: '0 auto', minHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
      <header className="study-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', position: 'relative' }}>
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

        {/* 클릭 시 팝오버를 트리거하는 뱃지 */}
        <button
          className="study-badge card-glow"
          onClick={() => {
            sfx.playClick();
            if (!showNavPopover) {
              setTempCategoryId(currentCategoryId); // 열 때 임시 카테고리를 현재 카테고리로 초기화
            }
            setShowNavPopover(!showNavPopover);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.9rem',
            fontWeight: 800,
            padding: '8px 16px',
            borderRadius: '16px',
            cursor: 'pointer',
            border: showNavPopover ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
            background: showNavPopover ? 'rgba(124, 58, 237, 0.05)' : 'var(--bg-secondary)',
            color: 'var(--text-main)',
            fontFamily: 'var(--font-game)',
            boxShadow: 'var(--shadow-normal)',
            transition: 'all 0.2s'
          }}
        >
          📖 {quizData.find(c => c.id === currentCategoryId)?.name} - Part {currentPart.id}. {currentPart.title} <span style={{ transition: 'transform 0.2s', transform: showNavPopover ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
        </button>

        {/* 팝오버 내비게이터 카드 */}
        {showNavPopover && (
          <>
            {/* 바깥 딤 영역을 클릭하면 닫히게 하는 투명 오버레이 */}
            <div 
              onClick={() => setShowNavPopover(false)}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }}
            />
            <div 
              className="card-glow slide-up-anim" 
              style={{ 
                position: 'absolute', 
                top: '48px', 
                right: '0', 
                width: '350px', 
                zIndex: 100, 
                padding: '16px',
                borderRadius: '16px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {/* 5대 로봇 카테고리 탭 (스크롤 없이 균등하게 가로폭 전체 차지) */}
              <div style={{ display: 'flex', gap: '4px', width: '100%', paddingBottom: '4px' }}>
                {quizData.map((cat) => {
                  const isActive = cat.id === tempCategoryId;
                  return (
                    <button
                      key={cat.id}
                      title={cat.name}
                      onClick={() => {
                        sfx.playClick();
                        setTempCategoryId(cat.id);
                      }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        padding: '6px 2px',
                        borderRadius: '10px',
                        border: isActive ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
                        background: isActive ? 'rgba(124, 58, 237, 0.08)' : 'var(--bg-primary)',
                        fontSize: '0.78rem',
                        fontWeight: isActive ? 800 : 600,
                        color: isActive ? 'var(--color-primary)' : 'var(--text-main)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontFamily: 'var(--font-game)'
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>{cat.icon}</span>
                      <span>{categoryWordMapping[cat.id] || cat.name.slice(0, 2)}</span>
                    </button>
                  );
                })}
              </div>

              {/* 챕터 리스트 (선택한 임시 카테고리의 챕터들을 보여줌) */}
              <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '2px' }}>
                {quizData.find(c => c.id === tempCategoryId)?.parts.map((p) => {
                  const isPartActive = tempCategoryId === currentCategoryId && p.id === currentPart.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        sfx.playClick();
                        setCurrentCategoryId(tempCategoryId); // 최종 챕터 선택 시 실제 활성화 카테고리 반영
                        setCurrentPart(p); // 최종 챕터 선택 시 학습 파트 변경
                        setShowNavPopover(false); // 팝오버 닫기
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid transparent',
                        background: isPartActive ? 'rgba(14, 165, 233, 0.06)' : 'transparent',
                        color: isPartActive ? 'var(--color-neon-cyan)' : 'var(--text-main)',
                        fontWeight: isPartActive ? 750 : 500,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        fontFamily: 'var(--font-game)'
                      }}
                    >
                      Part {p.id}. {p.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
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
