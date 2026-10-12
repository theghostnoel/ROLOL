/**
 * Generates a completely standalone single HTML file containing all HTML, CSS, and JS
 * so the user can download and open it in any web browser without installation.
 */

export function generateStandaloneHtml(): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Công Cụ Lọc Trùng Link Facebook</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --primary: #1877f2;
      --primary-hover: #166fe5;
      --primary-soft: #eff6ff;
      --success: #16a34a;
      --success-soft: #f0fdf4;
      --warning: #d97706;
      --warning-soft: #fffbeb;
      --danger: #dc2626;
      --danger-soft: #fef2f2;
      --radius: 12px;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0b0f19;
        --card-bg: #111827;
        --text: #f1f5f9;
        --text-muted: #94a3b8;
        --border: #1f2937;
        --primary: #2563eb;
        --primary-hover: #3b82f6;
        --primary-soft: #172554;
        --success: #22c55e;
        --success-soft: #052e16;
        --warning: #f59e0b;
        --warning-soft: #451a03;
        --danger: #ef4444;
        --danger-soft: #450a0a;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg); color: var(--text); padding: 16px; line-height: 1.5; min-height: 100vh; }
    .container { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
    header { background: var(--card-bg); padding: 20px 24px; border-radius: var(--radius); border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    h1 { font-size: 24px; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 10px; }
    .subtitle { color: var(--text-muted); font-size: 14px; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
    @media(min-width: 768px) { .grid { grid-template-columns: 1fr 1fr; } }
    .card { background: var(--card-bg); padding: 20px; border-radius: var(--radius); border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 14px; }
    .card-title { font-size: 16px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
    .badge { padding: 3px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; background: var(--primary-soft); color: var(--primary); }
    .input-group { display: flex; gap: 8px; }
    input[type="text"], textarea { width: 100%; border: 1px solid var(--border); background: var(--bg); color: var(--text); padding: 10px 12px; border-radius: 8px; font-size: 14px; outline: none; }
    input[type="text"]:focus, textarea:focus { border-color: var(--primary); ring: 2px var(--primary); }
    textarea { height: 240px; resize: vertical; font-family: monospace; font-size: 13px; line-height: 1.4; }
    button { background: var(--primary); color: white; border: none; border-radius: 8px; padding: 10px 16px; font-weight: 600; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: background 0.2s; }
    button:hover { background: var(--primary-hover); }
    button.btn-secondary { background: transparent; border: 1px solid var(--border); color: var(--text); }
    button.btn-secondary:hover { background: var(--border); }
    button.btn-danger { background: var(--danger-soft); color: var(--danger); border: 1px solid var(--border); }
    button.btn-danger:hover { background: var(--danger); color: white; }
    .options { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; padding: 12px; background: var(--bg); border-radius: 8px; font-size: 13px; }
    .checkbox-label { display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; }
    .status-box { font-size: 13px; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    @media(min-width: 640px) { .stats-grid { grid-template-columns: repeat(4, 1fr); } }
    .stat-card { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px; text-align: center; }
    .stat-val { font-size: 22px; font-weight: 700; }
    .stat-label { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .stat-val.primary { color: var(--primary); }
    .stat-val.success { color: var(--success); }
    .stat-val.warning { color: var(--warning); }
    .stat-val.danger { color: var(--danger); }
    .results-box { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--card-bg); max-height: 480px; overflow-y: auto; }
    .result-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid var(--border); font-size: 13px; font-family: monospace; }
    .result-item:last-child { border-bottom: none; }
    .result-item:hover { background: var(--bg); }
    .result-idx { color: var(--text-muted); width: 40px; font-weight: 600; }
    .result-link { flex: 1; word-break: break-all; color: var(--primary); text-decoration: none; }
    .result-link:hover { text-decoration: underline; }
    .alert { padding: 12px 14px; border-radius: 8px; font-size: 13px; line-height: 1.4; display: none; }
    .alert-warning { background: var(--warning-soft); color: var(--warning); border: 1px solid var(--warning); }
    .alert-danger { background: var(--danger-soft); color: var(--danger); border: 1px solid var(--danger); }
    .alert-success { background: var(--success-soft); color: var(--success); border: 1px solid var(--success); }
    .tabs { display: flex; gap: 8px; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 8px; }
    .tab-btn { background: transparent; color: var(--text-muted); border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; }
    .tab-btn.active { background: var(--primary-soft); color: var(--primary); font-weight: 600; }
    .toast { position: fixed; bottom: 20px; right: 20px; background: #0f172a; color: white; padding: 12px 20px; border-radius: 8px; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: none; z-index: 9999; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        Công Cụ Lọc Trùng Link Facebook
      </h1>
      <p class="subtitle">Tự động đọc Google Sheet (Nguồn 1) và lọc ra những link Facebook MỚI từ Nguồn 2 với tốc độ cao, xử lý link thông minh.</p>
    </header>

    <div class="grid">
      <!-- NGUON 1 -->
      <div class="card">
        <div class="card-title">
          <span>NGUỒN 1: Google Sheet</span>
          <span id="src1CountBadge" class="badge">0 link</span>
        </div>
        <div class="input-group">
          <input type="text" id="sheetUrlInput" placeholder="Dán link Google Sheet hoặc link CSV xuất bản web..." />
          <button id="btnReloadSheet" title="Tải lại dữ liệu từ Google Sheet">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
            Tải Sheet
          </button>
        </div>

        <div class="status-box">
          <span id="src1StatusText">Chưa có dữ liệu từ Google Sheet</span>
          <label style="cursor: pointer; color: var(--primary); font-weight: 500;">
            📁 Hoặc nạp file CSV/TXT
            <input type="file" id="src1FileInput" accept=".csv,.txt" style="display:none;" />
          </label>
        </div>

        <div id="sheetAlert" class="alert"></div>

        <div style="font-size: 12px; color: var(--text-muted); background: var(--bg); padding: 10px; border-radius: 8px;">
          💡 <strong>Mẹo mở quyền Google Sheet:</strong><br>
          1. Trong Sheet, chọn <em>Tệp (File)</em> &gt; <em>Chia sẻ (Share)</em> &gt; <em>Xuất bản lên web (Publish to web)</em> &gt; Chọn dạng <strong>CSV</strong> &gt; Bấm <em>Xuất bản</em> và dán link vào đây.<br>
          2. Hoặc đơn giản là mở quyền xem <em>"Bất kỳ ai có đường liên kết"</em> (Anyone with the link).
        </div>
      </div>

      <!-- NGUON 2 -->
      <div class="card">
        <div class="card-title">
          <span>NGUỒN 2: Danh sách link mới cần kiểm tra</span>
          <span id="src2CountBadge" class="badge">0 dòng</span>
        </div>
        <textarea id="src2Textarea" placeholder="Dán danh sách link Facebook vào đây (mỗi dòng một link, dán được hàng chục nghìn dòng)..."></textarea>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button id="btnClearSrc2" class="btn-danger">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Xoá
          </button>
          <button id="btnScan" style="min-width: 140px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            QUÉT LỌC TRÙNG
          </button>
        </div>
      </div>
    </div>

    <!-- OPTIONS -->
    <div class="options">
      <span style="font-weight: 600;">Tuỳ chọn chuẩn hoá:</span>
      <label class="checkbox-label">
        <input type="checkbox" id="optIgnoreDots" checked>
        Bỏ qua dấu chấm trong tên tài khoản (Facebook coi <code>hoang.nga.bk</code> và <code>hoangngabk</code> là 1)
      </label>
      <label class="checkbox-label">
        <input type="checkbox" id="optAutoRefreshSheet" checked>
        Tự động tải lại Google Sheet mỗi khi bấm "Quét"
      </label>
    </div>

    <!-- STATS -->
    <div class="stats-grid">
      <div class="stat-card">
        <div id="statTotalSrc2" class="stat-val primary">0</div>
        <div class="stat-label">Tổng link Nguồn 2</div>
      </div>
      <div class="stat-card">
        <div id="statDupInSrc2" class="stat-val warning">0</div>
        <div class="stat-label">Trùng nội bộ Nguồn 2</div>
      </div>
      <div class="stat-card">
        <div id="statInSrc1" class="stat-val danger">0</div>
        <div class="stat-label">Đã có ở Nguồn 1</div>
      </div>
      <div class="stat-card">
        <div id="statNewLinks" class="stat-val success">0</div>
        <div class="stat-label">LINK MỚI (CHỈ NGUỒN 2)</div>
      </div>
    </div>

    <!-- RESULTS -->
    <div class="card">
      <div class="card-title">
        <div class="tabs">
          <button id="tabNew" class="tab-btn active">Link Mới (<span id="tabCountNew">0</span>)</button>
          <button id="tabDupSrc1" class="tab-btn">Đã có ở Nguồn 1 (<span id="tabCountDup1">0</span>)</button>
          <button id="tabDupInternal" class="tab-btn">Lặp nội bộ Nguồn 2 (<span id="tabCountDupInternal">0</span>)</button>
          <button id="tabInvalid" class="tab-btn">Không hợp lệ (<span id="tabCountInvalid">0</span>)</button>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="btnCopyResult" class="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy kết quả
          </button>
          <button id="btnDownloadTxt" class="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Tải .txt
          </button>
        </div>
      </div>

      <div id="resultsList" class="results-box">
        <div style="padding: 30px; text-align: center; color: var(--text-muted); font-size: 14px;">
          Chưa có kết quả. Nhập Google Sheet và dán link Nguồn 2 rồi bấm "QUÉT LỌC TRÙNG".
        </div>
      </div>
    </div>
  </div>

  <div id="toast" class="toast">Đã copy vào bộ nhớ tạm!</div>

  <script>
    // State variables
    let src1KeysSet = new Set();
    let src1RawCount = 0;
    let scanResults = {
      newLinks: [],
      dupInSrc1: [],
      dupInternal: [],
      invalidLines: []
    };
    let activeTab = 'new';

    // Normalizer logic
    function normalizeFb(raw, ignoreDots) {
      if (!raw || typeof raw !== 'string') return { isValid: false, key: '', original: raw, reason: 'Dòng trống' };
      let str = raw.trim().replace(/[\\u200B-\\u200D\\uFEFF]/g, '').trim();
      if (!str) return { isValid: false, key: '', original: raw, reason: 'Dòng trống' };

      // Handle wwww typo
      str = str.replace(/^https?:\\/\\/w{4,}\\./i, 'https://www.').replace(/^w{4,}\\./i, 'www.');

      // Missing slash typo after facebook.com/fb.com
      str = str.replace(/(https?:\\/\\/)?((?:[a-z0-9_-]+\\.)?(?:facebook\\.com|fb\\.com))([a-zA-Z0-9_.])/i, (m, proto, domain, nextChar) => {
        return (proto || 'https://') + domain + '/' + nextChar;
      });

      // Verify domain or profile.php
      const isFb = /(?:^|\\/\\/)(?:[a-zA-Z0-9_-]+\\.)?(?:facebook\\.com|fb\\.com|fb\\.watch|fb\\.me)(?:[:/]|$)/i.test(str);
      if (!isFb) {
        if (/^profile\\.php\\?id=\\d+/i.test(str)) {
          str = 'https://www.facebook.com/' + str;
        } else {
          return { isValid: false, key: '', original: raw, reason: 'Không phải link Facebook' };
        }
      }

      if (!/^https?:\\/\\//i.test(str)) str = 'https://' + str;

      try {
        const url = new URL(str);
        url.hash = '';

        // Check profile.php?id=12345
        if (url.pathname.includes('/profile.php')) {
          const id = url.searchParams.get('id');
          if (id && /^\\d+$/.test(id.trim())) {
            return { isValid: true, key: 'id:' + id.trim(), original: raw, type: 'id' };
          }
        }

        // Check /people/name/id
        const pMatch = url.pathname.match(/\\/people\\/[^/]+\\/(\\d+)/i);
        if (pMatch && pMatch[1]) {
          return { isValid: true, key: 'id:' + pMatch[1], original: raw, type: 'id' };
        }

        // Check /user/id
        const uMatch = url.pathname.match(/\\/user\\/(\\d+)/i);
        if (uMatch && uMatch[1]) {
          return { isValid: true, key: 'id:' + uMatch[1], original: raw, type: 'id' };
        }

        // Clean path
        let pathname = url.pathname.replace(/^\\/+ | \\/+$/g, '').trim();
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length === 0) return { isValid: false, key: '', original: raw, reason: 'Trang chủ' };

        let root = segments[0];
        if (root.toLowerCase() === 'p' && segments.length > 1) root = segments[1];

        let username = root.toLowerCase();
        if (/^\\d{8,}$/.test(username)) {
          return { isValid: true, key: 'id:' + username, original: raw, type: 'id' };
        }

        if (ignoreDots) {
          username = username.replace(/\\./g, '');
        }

        return { isValid: true, key: 'user:' + username, original: raw, type: 'user' };
      } catch (e) {
        return { isValid: false, key: '', original: raw, reason: 'Lỗi định dạng link' };
      }
    }

    // Google sheet CSV parser
    function parseCsvColA(text) {
      const lines = text.split(/\\r?\\n/);
      const res = [];
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;
        if (!line.includes(',') && !line.includes('"')) {
          res.push(line);
          continue;
        }
        let cellA = '';
        if (line.startsWith('"')) {
          let inQ = true;
          for (let j = 1; j < line.length; j++) {
            if (line[j] === '"') {
              if (j + 1 < line.length && line[j+1] === '"') {
                cellA += '"'; j++;
              } else { break; }
            } else { cellA += line[j]; }
          }
        } else {
          const cIdx = line.indexOf(',');
          cellA = cIdx !== -1 ? line.slice(0, cIdx) : line;
        }
        cellA = cellA.trim();
        if (cellA) res.push(cellA);
      }
      return res;
    }

    // Parse Sheet URL into CSV export URLs
    function getSheetExportUrls(url) {
      if (!url) return null;
      url = url.trim();
      if (url.includes('/pub') && url.includes('output=csv')) {
        return [url];
      }
      const match = url.match(/\\/spreadsheets\\/d\\/([a-zA-Z0-9_-]+)/);
      if (!match) return [url];
      const id = match[1];
      let gid = '0';
      const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
      if (gidMatch) gid = gidMatch[1];
      return [
        \`https://docs.google.com/spreadsheets/d/\${id}/export?format=csv&gid=\${gid}\`,
        \`https://docs.google.com/spreadsheets/d/\${id}/gviz/tq?tqx=out:csv&gid=\${gid}\`
      ];
    }

    // UI helpers
    function showToast(msg) {
      const t = document.getElementById('toast');
      t.innerText = msg;
      t.style.display = 'block';
      setTimeout(() => { t.style.display = 'none'; }, 2200);
    }

    function showAlert(msg, type) {
      const a = document.getElementById('sheetAlert');
      a.className = 'alert alert-' + type;
      a.innerHTML = msg;
      a.style.display = 'block';
    }

    function hideAlert() {
      document.getElementById('sheetAlert').style.display = 'none';
    }

    // Load sheet
    async function loadSheet(silently = false) {
      const input = document.getElementById('sheetUrlInput');
      const url = input.value.trim();
      if (!url) {
        if (!silently) showAlert('Vui lòng dán link Google Sheet hoặc link CSV xuất bản web.', 'warning');
        return false;
      }

      // Save to localStorage with try/catch
      try {
        localStorage.setItem('fb_tool_sheet_url', url);
      } catch (e) {
        console.error('localStorage error', e);
      }

      const btn = document.getElementById('btnReloadSheet');
      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Đang tải...';
      hideAlert();

      const exportUrls = getSheetExportUrls(url);
      let success = false;
      let textData = '';

      for (const tryUrl of exportUrls) {
        try {
          const resp = await fetch(tryUrl, { cache: 'no-store' });
          if (resp.ok) {
            textData = await resp.text();
            if (textData && textData.length > 5) {
              success = true;
              break;
            }
          }
        } catch (err) {
          console.warn('Fetch failed for', tryUrl, err);
        }
      }

      btn.disabled = false;
      btn.innerHTML = origText;

      if (!success) {
        showAlert(\`
          ⚠️ <strong>Không thể tải Google Sheet trực tiếp do chính sách bảo mật CORS hoặc trang tính chưa công khai.</strong><br>
          <strong>Cách xử lý đơn giản:</strong><br>
          1. Trong Google Sheet: Bấm <strong>Tệp (File) &gt; Chia sẻ &gt; Xuất bản lên web</strong> &gt; Chọn định dạng <strong>CSV</strong> &gt; Bấm <strong>Xuất bản</strong> rồi copy link dán vào đây.<br>
          2. Hoặc tải file <code>.csv</code> / <code>.txt</code> về máy rồi bấm nút <strong>"📁 Nạp file CSV/TXT"</strong> bên dưới.
        \`, 'danger');
        return false;
      }

      // Parse links
      const links = parseCsvColA(textData);
      const ignoreDots = document.getElementById('optIgnoreDots').checked;
      src1KeysSet.clear();
      let validCount = 0;

      for (const item of links) {
        const norm = normalizeFb(item, ignoreDots);
        if (norm.isValid && norm.key) {
          src1KeysSet.add(norm.key);
          validCount++;
        }
      }

      src1RawCount = links.length;
      document.getElementById('src1CountBadge').innerText = \`\${validCount} link\`;
      const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      document.getElementById('src1StatusText').innerText = \`Đã nạp \${validCount} link hợp lệ (cập nhật: \${timeStr})\`;
      showAlert(\`✅ Đã nạp thành công \${validCount} link Facebook từ Google Sheet!\`, 'success');
      setTimeout(hideAlert, 4000);
      return true;
    }

    // Run duplicate scan
    async function runScan() {
      const autoRefresh = document.getElementById('optAutoRefreshSheet').checked;
      const sheetUrl = document.getElementById('sheetUrlInput').value.trim();

      if (autoRefresh && sheetUrl) {
        await loadSheet(true);
      }

      const text = document.getElementById('src2Textarea').value;
      const lines = text.split(/\\r?\\n/).map(l => l.trim()).filter(Boolean);
      document.getElementById('src2CountBadge').innerText = \`\${lines.length} dòng\`;

      if (lines.length === 0) {
        alert('Vui lòng dán ít nhất 1 link vào ô Nguồn 2.');
        return;
      }

      const ignoreDots = document.getElementById('optIgnoreDots').checked;
      const seenInSrc2 = new Set();

      scanResults = {
        newLinks: [],
        dupInSrc1: [],
        dupInternal: [],
        invalidLines: []
      };

      for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const norm = normalizeFb(raw, ignoreDots);

        if (!norm.isValid) {
          scanResults.invalidLines.push({ raw, reason: norm.reason || 'Không hợp lệ' });
          continue;
        }

        // Check if duplicate within source 2 itself
        if (seenInSrc2.has(norm.key)) {
          scanResults.dupInternal.push({ raw, key: norm.key });
          continue;
        }
        seenInSrc2.add(norm.key);

        // Check if already in source 1
        if (src1KeysSet.has(norm.key)) {
          scanResults.dupInSrc1.push({ raw, key: norm.key });
        } else {
          scanResults.newLinks.push({ raw, key: norm.key });
        }
      }

      // Update counters
      document.getElementById('statTotalSrc2').innerText = lines.length;
      document.getElementById('statDupInSrc2').innerText = scanResults.dupInternal.length;
      document.getElementById('statInSrc1').innerText = scanResults.dupInSrc1.length;
      document.getElementById('statNewLinks').innerText = scanResults.newLinks.length;

      document.getElementById('tabCountNew').innerText = scanResults.newLinks.length;
      document.getElementById('tabCountDup1').innerText = scanResults.dupInSrc1.length;
      document.getElementById('tabCountDupInternal').innerText = scanResults.dupInternal.length;
      document.getElementById('tabCountInvalid').innerText = scanResults.invalidLines.length;

      renderResults();
    }

    // Render results list
    function renderResults() {
      const container = document.getElementById('resultsList');
      let items = [];

      if (activeTab === 'new') items = scanResults.newLinks;
      else if (activeTab === 'dup1') items = scanResults.dupInSrc1;
      else if (activeTab === 'internal') items = scanResults.dupInternal;
      else if (activeTab === 'invalid') items = scanResults.invalidLines;

      if (items.length === 0) {
        container.innerHTML = '<div style="padding: 30px; text-align: center; color: var(--text-muted); font-size: 14px;">Không có dòng nào trong mục này.</div>';
        return;
      }

      // Limit initial DOM render to 1000 for high performance, virtualize if needed
      const maxDisplay = 1000;
      const displayItems = items.slice(0, maxDisplay);

      let html = '';
      for (let i = 0; i < displayItems.length; i++) {
        const it = displayItems[i];
        const raw = it.raw;
        const href = /^https?:\\/\\//i.test(raw) ? raw : ('https://' + raw);
        html += \`
          <div class="result-item">
            <span class="result-idx">\${i + 1}</span>
            <a href="\${encodeURI(href)}" target="_blank" rel="noopener noreferrer" class="result-link">\${escapeHtml(raw)}</a>
            \${it.reason ? \`<span style="color: var(--danger); font-size: 11px;">\${it.reason}</span>\` : ''}
          </div>
        \`;
      }

      if (items.length > maxDisplay) {
        html += \`<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 12px; background: var(--bg);">... và còn \${items.length - maxDisplay} dòng nữa (sẽ được xuất đầy đủ khi Copy hoặc Tải file).</div>\`;
      }

      container.innerHTML = html;
    }

    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Event listeners
    document.getElementById('btnReloadSheet').addEventListener('click', () => loadSheet(false));
    document.getElementById('btnScan').addEventListener('click', runScan);
    document.getElementById('btnClearSrc2').addEventListener('click', () => {
      document.getElementById('src2Textarea').value = '';
      document.getElementById('src2CountBadge').innerText = '0 dòng';
    });

    // File input for source 1
    document.getElementById('src1FileInput').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        const text = evt.target.result;
        const links = parseCsvColA(text);
        const ignoreDots = document.getElementById('optIgnoreDots').checked;
        src1KeysSet.clear();
        let valid = 0;
        for (const it of links) {
          const n = normalizeFb(it, ignoreDots);
          if (n.isValid && n.key) {
            src1KeysSet.add(n.key);
            valid++;
          }
        }
        src1RawCount = links.length;
        document.getElementById('src1CountBadge').innerText = valid + ' link';
        document.getElementById('src1StatusText').innerText = 'Đã nạp ' + valid + ' link từ file: ' + file.name;
        showAlert('✅ Đã nạp thành công ' + valid + ' link từ file ' + file.name, 'success');
      };
      reader.readAsText(file);
    });

    // Tabs
    const tabs = [
      { id: 'tabNew', key: 'new' },
      { id: 'tabDup1', key: 'dup1' },
      { id: 'tabDupInternal', key: 'internal' },
      { id: 'tabInvalid', key: 'invalid' }
    ];
    tabs.forEach(t => {
      document.getElementById(t.id).addEventListener('click', () => {
        tabs.forEach(o => document.getElementById(o.id).classList.remove('active'));
        document.getElementById(t.id).classList.add('active');
        activeTab = t.key;
        renderResults();
      });
    });

    // Copy result
    document.getElementById('btnCopyResult').addEventListener('click', () => {
      let items = scanResults.newLinks;
      if (activeTab === 'dup1') items = scanResults.dupInSrc1;
      else if (activeTab === 'internal') items = scanResults.dupInternal;
      else if (activeTab === 'invalid') items = scanResults.invalidLines;

      if (items.length === 0) {
        alert('Không có dữ liệu trong mục này để copy.');
        return;
      }

      const text = items.map(it => it.raw).join('\\n');
      navigator.clipboard.writeText(text).then(() => {
        showToast('Đã copy ' + items.length + ' dòng vào clipboard!');
      }).catch(err => {
        // Fallback copy
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Đã copy ' + items.length + ' dòng!');
      });
    });

    // Download .txt
    document.getElementById('btnDownloadTxt').addEventListener('click', () => {
      const items = scanResults.newLinks;
      if (items.length === 0) {
        alert('Chưa có link mới để tải về.');
        return;
      }
      const text = items.map(it => it.raw).join('\\n');
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'link-facebook-moi-' + new Date().toISOString().slice(0, 10) + '.txt';
      a.click();
    });

    // Auto-load on startup
    window.addEventListener('DOMContentLoaded', () => {
      try {
        const savedUrl = localStorage.getItem('fb_tool_sheet_url');
        if (savedUrl) {
          document.getElementById('sheetUrlInput').value = savedUrl;
          loadSheet(true);
        }
      } catch (e) {
        console.error(e);
      }
    });
  </script>
</body>
</html>`;
}
