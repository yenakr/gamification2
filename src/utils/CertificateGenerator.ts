export class CertificateGenerator {
  static generateCanvas(
    userName: string,
    quizTitle: string,
    _score: number,
    _maxCombo: number,
    completedAt: string,
    isMaster: boolean = false
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // 1. Draw elegant background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw border
    ctx.strokeStyle = isMaster ? '#f59e0b' : '#7c3aed'; // Gold for master, Royal purple for normal
    ctx.lineWidth = 15;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    ctx.strokeStyle = isMaster ? '#0ea5e9' : '#ec4899'; // Neon Cyan for master, pink for normal
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // Decorative corner frames
    ctx.fillStyle = isMaster ? '#f59e0b' : '#7c3aed';
    // Top-left
    ctx.fillRect(35, 35, 30, 6);
    ctx.fillRect(35, 35, 6, 30);
    // Top-right
    ctx.fillRect(canvas.width - 65, 35, 30, 6);
    ctx.fillRect(canvas.width - 41, 35, 6, 30);
    // Bottom-left
    ctx.fillRect(35, canvas.height - 41, 30, 6);
    ctx.fillRect(35, canvas.height - 65, 6, 30);
    // Bottom-right
    ctx.fillRect(canvas.width - 65, canvas.height - 41, 30, 6);
    ctx.fillRect(canvas.width - 41, canvas.height - 65, 6, 30);

    // 3. Draw Content
    // Main Title
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 38px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isMaster ? '마스터 이수증' : '이 수 증', canvas.width / 2, 100);

    // User Name
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 24px "Noto Sans KR", sans-serif';
    ctx.fillText(`성 명 : ${userName || '게스트'}`, canvas.width / 2, 180);

    // Description text
    ctx.fillStyle = '#374151';
    ctx.font = '18px "Noto Sans KR", sans-serif';
    ctx.fillText('위 사람은', canvas.width / 2, 240);

    // Course Title (Highlighted in Gold/Purple and Bold)
    ctx.fillStyle = isMaster ? '#f59e0b' : '#7c3aed';
    ctx.font = 'bold 24px "Noto Sans KR", sans-serif';
    ctx.fillText(`[${quizTitle}]`, canvas.width / 2, 290);

    // Remaining Description
    ctx.fillStyle = '#374151';
    ctx.font = '18px "Noto Sans KR", sans-serif';
    if (isMaster) {
      ctx.fillText('위 분야 돌봄로봇의 모든 교육 과정을 성공적으로 수료하여', canvas.width / 2, 340);
      ctx.fillText('마스터 자격을 획득하였기에 이 증서를 수여합니다.', canvas.width / 2, 375);
    } else {
      ctx.fillText('교육 과정을 성공적으로 완료하고 이수하였기에', canvas.width / 2, 340);
      ctx.fillText('이 이수증을 수여합니다.', canvas.width / 2, 375);
    }

    // 4. Details box (Only Completion Date)
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(200, 420, 400, 50);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(200, 420, 400, 50);

    ctx.fillStyle = '#4b5563';
    ctx.font = '15px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`이수 일시 : ${completedAt}`, canvas.width / 2, 445);

    // Date in footer
    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 18px "Noto Sans KR", sans-serif';
    ctx.fillText(dateStr, canvas.width / 2, 530);

    return canvas;
  }

  static downloadImage(
    userName: string,
    quizTitle: string,
    score: number,
    maxCombo: number,
    isMaster: boolean = false
  ) {
    const dateStr = new Date().toLocaleString('ko-KR');
    const canvas = this.generateCanvas(userName, quizTitle, score, maxCombo, dateStr, isMaster);
    const dataUrl = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `${isMaster ? '마스터' : '수료'}증_${userName}_${quizTitle.replace(/\s+/g, '_')}.png`;
    link.href = dataUrl;
    link.click();
  }

  static printPdf(
    userName: string,
    quizTitle: string,
    score: number,
    maxCombo: number,
    isMaster: boolean = false
  ) {
    const dateStr = new Date().toLocaleString('ko-KR');
    const canvas = this.generateCanvas(userName, quizTitle, score, maxCombo, dateStr, isMaster);
    const dataUrl = canvas.toDataURL('image/png');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('팝업 차단이 활성화되어 있어 인쇄창을 열 수 없습니다. 팝업 차단을 해제해 주세요.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>이수증 인쇄 - ${userName}</title>
          <style>
            body {
              margin: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background-color: #f3f4f6;
              font-family: sans-serif;
            }
            img {
              max-width: 100%;
              height: auto;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            @media print {
              body {
                background: none;
              }
              img {
                box-shadow: none;
                width: 100%;
              }
              @page {
                size: landscape;
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" />
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}
