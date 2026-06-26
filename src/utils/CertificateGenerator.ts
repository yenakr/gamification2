export class CertificateGenerator {
  static generateCanvas(
    userName: string,
    quizTitle: string,
    score: number,
    maxCombo: number,
    completedAt: string
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
    ctx.strokeStyle = '#7c3aed'; // Royal purple border
    ctx.lineWidth = 15;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    ctx.strokeStyle = '#ec4899'; // Inner pink thin border
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // Decorative corner frames
    ctx.fillStyle = '#7c3aed';
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
    // Main Title: 수 료 증
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 36px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('이 수 증', canvas.width / 2, 90);

    // Certificate Number (Mock)
    const certNo = `제 CBQ-${Date.now().toString().slice(-6)} 호`;
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px "Noto Sans KR", sans-serif';
    ctx.fillText(certNo, canvas.width / 2, 130);

    // User Name
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 24px "Noto Sans KR", sans-serif';
    ctx.fillText(`성 명 : ${userName || '게스트'}`, canvas.width / 2, 200);

    // Description text
    ctx.fillStyle = '#374151';
    ctx.font = '16px "Noto Sans KR", sans-serif';
    const descLine1 = '위 사람은 돌봄로봇 교육 플랫폼 [Care Bot Quiz]에서 제공하는';
    const descLine2 = `[${quizTitle}] 교육 과정을`;
    const descLine3 = '성공적으로 완료하고 우수한 성적으로 이수하였기에';
    const descLine4 = '이 이수증을 수여합니다.';

    ctx.fillText(descLine1, canvas.width / 2, 260);
    ctx.fillStyle = '#7c3aed';
    ctx.font = 'bold 18px "Noto Sans KR", sans-serif';
    ctx.fillText(descLine2, canvas.width / 2, 290);
    ctx.fillStyle = '#374151';
    ctx.font = '16px "Noto Sans KR", sans-serif';
    ctx.fillText(descLine3, canvas.width / 2, 320);
    ctx.fillText(descLine4, canvas.width / 2, 350);

    // 4. Details box
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(150, 390, 500, 80);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(150, 390, 500, 80);

    ctx.fillStyle = '#4b5563';
    ctx.font = '14px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`• 최종 점수 : ${score}점`, 200, 415);
    ctx.fillText(`• 최대 콤보 : 🔥 ${maxCombo} Combo`, 200, 445);
    ctx.fillText(`• 이수 일시 : ${completedAt}`, 420, 415);
    ctx.fillText(`• 발급 기관 : Care Bot Quiz`, 420, 445);

    // 5. Stamp Seal decoration
    ctx.fillStyle = 'rgba(236, 72, 153, 0.15)';
    ctx.beginPath();
    ctx.arc(canvas.width - 120, canvas.height - 100, 45, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(canvas.width - 120, canvas.height - 100, 40, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 14px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('돌봄로봇', canvas.width - 120, canvas.height - 110);
    ctx.fillText('교육인증', canvas.width - 120, canvas.height - 90);

    // Date in footer
    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    ctx.fillStyle = '#4b5563';
    ctx.font = '16px "Noto Sans KR", sans-serif';
    ctx.fillText(dateStr, canvas.width / 2, 510);

    // Footer signature
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 20px "Noto Sans KR", sans-serif';
    ctx.fillText('돌봄 로봇 학습 센터 교육본부장', canvas.width / 2, 545);

    return canvas;
  }

  static downloadImage(
    userName: string,
    quizTitle: string,
    score: number,
    maxCombo: number
  ) {
    const dateStr = new Date().toLocaleString('ko-KR');
    const canvas = this.generateCanvas(userName, quizTitle, score, maxCombo, dateStr);
    const dataUrl = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `수료증_${userName}_${quizTitle.replace(/\s+/g, '_')}.png`;
    link.href = dataUrl;
    link.click();
  }

  static printPdf(
    userName: string,
    quizTitle: string,
    score: number,
    maxCombo: number
  ) {
    const dateStr = new Date().toLocaleString('ko-KR');
    const canvas = this.generateCanvas(userName, quizTitle, score, maxCombo, dateStr);
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
