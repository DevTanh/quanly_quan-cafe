// src/components/tables/components/TableQrModal.tsx
/**
 * Modal hiển thị mã QR gọi món cho một bàn.
 *
 * URL format:  {origin}/?qr=1&tableId={id}
 * QR render:   thư viện `qrcode` — render canvas 100% client-side, không cần internet.
 *
 * Cài đặt:
 *   npm install qrcode
 *   npm install --save-dev @types/qrcode
 *
 * Tính năng:
 *  - Hiển thị QR full size (220×220px) trên canvas
 *  - Copy link
 *  - Download ảnh QR (.png)
 *  - In QR (print-friendly)
 *  - Hiển thị tên bàn + khu vực
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes, faCopy, faDownload, faPrint, faCheck,
  faQrcode, faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';

interface Props {
  tableId: string;
  tableName: string;
  zoneName?: string;
  onClose: () => void;
}

const getQrUrl = (tableId: string): string => {
  const origin = window.location.origin;
  return `${origin}/?qr=1&tableId=${tableId}`;
};

/* ════════════════════════════════════════════════════════════════ */
const TableQrModal: React.FC<Props> = ({ tableId, tableName, zoneName, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const qrUrl = getQrUrl(tableId);

  /* ── Render QR lên canvas khi mount ── */
  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, qrUrl, {
      width: 220,
      margin: 2,
      color: { dark: '#111111', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
  }, [qrUrl]);

  /* ── Copy link ── */
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
    } catch {
      const el = document.createElement('textarea');
      el.value = qrUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [qrUrl]);

  /* ── Download QR as PNG ── */
  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      // Tạo canvas lớn hơn để download chất lượng cao
      const offscreen = document.createElement('canvas');
      await QRCode.toCanvas(offscreen, qrUrl, {
        width: 600,
        margin: 3,
        color: { dark: '#111111', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
      offscreen.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `QR-${tableName.replace(/\s+/g, '-')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      console.error('Download QR failed', err);
    } finally {
      setDownloading(false);
    }
  }, [qrUrl, tableName]);

  /* ── Print ── */
  const handlePrint = useCallback(async () => {
    // Tạo data URL từ canvas để nhúng vào trang in
    const offscreen = document.createElement('canvas');
    await QRCode.toCanvas(offscreen, qrUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#111111', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
    const dataUrl = offscreen.toDataURL('image/png');

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Gọi món — ${tableName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', sans-serif;
              display: flex; align-items: center; justify-content: center;
              min-height: 100vh; background: white;
            }
            .card {
              text-align: center; padding: 32px 40px;
              border: 2px solid #e5e7eb; border-radius: 16px;
              max-width: 340px; width: 100%;
            }
            .logo { font-size: 13px; color: #9ca3af; margin-bottom: 16px; letter-spacing: 0.05em; text-transform: uppercase; }
            .table-name { font-size: 26px; font-weight: 800; color: #111; margin-bottom: 4px; }
            .zone-name { font-size: 13px; color: #9ca3af; margin-bottom: 20px; }
            .qr-wrap { display: inline-block; padding: 12px; border: 1.5px solid #e5e7eb; border-radius: 12px; margin-bottom: 20px; }
            .qr-wrap img { display: block; width: 220px; height: 220px; }
            .instruction { font-size: 14px; color: #374151; font-weight: 600; margin-bottom: 6px; }
            .sub { font-size: 12px; color: #9ca3af; }
            .url { font-size: 10px; color: #d1d5db; word-break: break-all; margin-top: 12px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">Quét để gọi món</div>
            <div class="table-name">${tableName}</div>
            ${zoneName ? `<div class="zone-name">${zoneName}</div>` : ''}
            <div class="qr-wrap">
              <img src="${dataUrl}" alt="QR Code" />
            </div>
            <div class="instruction">📱 Quét mã QR để gọi món</div>
            <div class="sub">Dùng camera điện thoại — không cần app</div>
            <div class="url">${qrUrl}</div>
          </div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank', 'width=500,height=700');
    if (!win) return;
    win.document.write(printContent);
    win.document.close();
    win.onload = () => { win.print(); };
  }, [tableName, zoneName, qrUrl]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[360px] overflow-hidden font-['Segoe_UI',sans-serif]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center">
              <FontAwesomeIcon icon={faQrcode} className="text-[#16a34a] text-base" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-gray-900 m-0 leading-snug">Mã QR gọi món</h2>
              <p className="text-[12px] text-gray-400 m-0">{tableName}{zoneName ? ` · ${zoneName}` : ''}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} className="text-xs" />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center px-6 pt-6 pb-4">
          {/* QR Card */}
          <div className="border-2 border-gray-100 rounded-2xl p-5 text-center bg-white shadow-sm">
            <p className="text-[11px] text-gray-400 uppercase tracking-widest font-semibold mb-3">
              Quét để gọi món
            </p>
            <div className="inline-block p-2 border border-gray-100 rounded-xl bg-white">
              {/* Canvas — render bởi qrcode lib */}
              <canvas
                ref={canvasRef}
                width={220}
                height={220}
                className="block rounded-lg"
                style={{ width: 220, height: 220 }}
              />
            </div>
            <p className="text-[18px] font-extrabold text-gray-900 mt-3 mb-0 tracking-tight">
              {tableName}
            </p>
            {zoneName && (
              <p className="text-[12.5px] text-gray-400 mt-0.5 m-0">{zoneName}</p>
            )}
          </div>

          {/* Instruction */}
          <div className="flex items-center gap-2 mt-4 text-[12.5px] text-gray-500 bg-gray-50 rounded-xl px-4 py-2.5 w-full">
            <span className="text-base">📱</span>
            <span>Dùng camera điện thoại để quét — không cần cài app</span>
          </div>
        </div>

        {/* URL copy */}
        <div className="px-6 pb-2">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
            <span className="flex-1 text-[11.5px] text-gray-500 truncate font-mono">{qrUrl}</span>
            <button
              onClick={handleCopy}
              className={[
                'shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
              ].join(' ')}
            >
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-[10px]" />
              {copied ? 'Đã copy!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2 px-6 pt-3 pb-5">
          {/* Open in new tab */}
          <a
            href={qrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors no-underline"
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} className="text-gray-400 text-sm" />
            Xem thử
          </a>

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faDownload} className="text-gray-400 text-sm" />
            {downloading ? 'Đang tải...' : 'Tải về'}
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <FontAwesomeIcon icon={faPrint} className="text-gray-400 text-sm" />
            In mã QR
          </button>
        </div>
      </div>
    </div>
  );
};

export default TableQrModal;