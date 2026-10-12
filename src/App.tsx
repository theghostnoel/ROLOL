/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  normalizeFacebookLink,
  parseGoogleSheetUrl,
  parseCsvColumnA,
  downloadFile,
  NormalizedResult,
} from './utils/facebookNormalizer';
import { generateStandaloneHtml } from './utils/standaloneHtml';
import {
  Search,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Moon,
  Sun,
  HelpCircle,
  X,
  FileText,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface ScanItem {
  raw: string;
  normalizedKey: string;
  type?: string;
  reason?: string;
}

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fb_tool_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('fb_tool_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('fb_tool_theme', 'light');
      }
    } catch (e) {
      console.error(e);
    }
  }, [darkMode]);

  // Source 1 state (Google Sheet)
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('fb_tool_sheet_url') || '';
    } catch {
      return '';
    }
  });
  const [isSheetLoading, setIsSheetLoading] = useState(false);
  const [sheetLastUpdated, setSheetLastUpdated] = useState<string | null>(null);
  const [src1Keys, setSrc1Keys] = useState<Set<string>>(new Set());
  const [src1TotalCount, setSrc1TotalCount] = useState<number>(0);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sheetSuccessMsg, setSheetSuccessMsg] = useState<string | null>(null);
  const [src1RawLinks, setSrc1RawLinks] = useState<string[]>([]);

  // Source 2 state
  const [src2Input, setSrc2Input] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);

  // Options
  const [ignoreDots, setIgnoreDots] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('fb_tool_ignore_dots');
      return val !== null ? val === 'true' : true;
    } catch {
      return true;
    }
  });

  const [autoRefreshSheet, setAutoRefreshSheet] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('fb_tool_auto_refresh');
      return val !== null ? val === 'true' : true;
    } catch {
      return true;
    }
  });

  // Results State
  const [hasScanned, setHasScanned] = useState(false);
  const [newLinks, setNewLinks] = useState<ScanItem[]>([]);
  const [dupInSrc1, setDupInSrc1] = useState<ScanItem[]>([]);
  const [dupInternal, setDupInternal] = useState<ScanItem[]>([]);
  const [invalidLines, setInvalidLines] = useState<ScanItem[]>([]);
  const [totalSrc2Count, setTotalSrc2Count] = useState(0);

  // UI state
  const [activeTab, setActiveTab] = useState<'new' | 'dup1' | 'internal' | 'invalid'>('new');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedTab, setCopiedTab] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showManualSrc1Modal, setShowManualSrc1Modal] = useState(false);
  const [manualSrc1Text, setManualSrc1Text] = useState('');
  const [previewTestUrl, setPreviewTestUrl] = useState('');

  const src1FileInputRef = useRef<HTMLInputElement>(null);
  const src2FileInputRef = useRef<HTMLInputElement>(null);

  // Persist options
  useEffect(() => {
    try {
      localStorage.setItem('fb_tool_ignore_dots', String(ignoreDots));
    } catch (e) {
      console.error(e);
    }
  }, [ignoreDots]);

  useEffect(() => {
    try {
      localStorage.setItem('fb_tool_auto_refresh', String(autoRefreshSheet));
    } catch (e) {
      console.error(e);
    }
  }, [autoRefreshSheet]);

  // Load Google Sheet function
  const fetchGoogleSheetData = async (targetUrl?: string, silent = false): Promise<boolean> => {
    const urlToFetch = (targetUrl !== undefined ? targetUrl : sheetUrl).trim();
    if (!urlToFetch) {
      if (!silent) setSheetError('Vui lòng nhập link Google Sheet hoặc link CSV xuất bản web.');
      return false;
    }

    try {
      localStorage.setItem('fb_tool_sheet_url', urlToFetch);
    } catch (e) {
      console.error('localStorage error', e);
    }

    setIsSheetLoading(true);
    setSheetError(null);
    setSheetSuccessMsg(null);

    const parsedUrls = parseGoogleSheetUrl(urlToFetch);
    const urlsToTry: string[] = [];

    if (parsedUrls) {
      urlsToTry.push(parsedUrls.exportCsvUrl);
      urlsToTry.push(parsedUrls.gvizUrl);
    } else {
      urlsToTry.push(urlToFetch);
    }

    let csvContent = '';
    let fetchedSuccessfully = false;

    for (const testUrl of urlsToTry) {
      try {
        const resp = await fetch(testUrl, { cache: 'no-store' });
        if (resp.ok) {
          const text = await resp.text();
          // Verify that it is not an HTML login page or error document
          if (text && !text.includes('<!DOCTYPE html>') && text.length > 2) {
            csvContent = text;
            fetchedSuccessfully = true;
            break;
          }
        }
      } catch (err) {
        console.warn('Fetch failed for URL:', testUrl, err);
      }
    }

    setIsSheetLoading(false);

    if (!fetchedSuccessfully) {
      setSheetError(`Không thể đọc trực tiếp từ link này do chính sách bảo mật CORS hoặc trang tính chưa công khai. Hãy xem hướng dẫn "Xuất bản lên web" bên dưới hoặc tải file CSV/TXT lên trực tiếp.`);
      return false;
    }

    // Process raw links
    const lines = parseCsvColumnA(csvContent);
    setSrc1RawLinks(lines);

    // Rebuild Set
    const keySet = new Set<string>();
    let validCount = 0;
    for (const raw of lines) {
      const norm = normalizeFacebookLink(raw, { ignoreDots });
      if (norm.isValid && norm.normalizedKey) {
        keySet.add(norm.normalizedKey);
        validCount++;
      }
    }

    setSrc1Keys(keySet);
    setSrc1TotalCount(validCount);
    const nowTime = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setSheetLastUpdated(nowTime);
    setSheetSuccessMsg(`Đã nạp thành công ${validCount.toLocaleString('vi-VN')} link từ Google Sheet (lúc ${nowTime}).`);
    return true;
  };

  // Auto-fetch on mount if sheetUrl exists
  useEffect(() => {
    if (sheetUrl.trim()) {
      fetchGoogleSheetData(sheetUrl, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When ignoreDots changes, update src1Keys from src1RawLinks
  useEffect(() => {
    if (src1RawLinks.length > 0) {
      const keySet = new Set<string>();
      let count = 0;
      for (const raw of src1RawLinks) {
        const norm = normalizeFacebookLink(raw, { ignoreDots });
        if (norm.isValid && norm.normalizedKey) {
          keySet.add(norm.normalizedKey);
          count++;
        }
      }
      setSrc1Keys(keySet);
      setSrc1TotalCount(count);
    }
  }, [ignoreDots, src1RawLinks]);

  // Handle local CSV/TXT upload for Source 1
  const handleSrc1FileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = (event.target?.result as string) || '';
        const lines = parseCsvColumnA(text);
        setSrc1RawLinks(lines);

        const keySet = new Set<string>();
        let valid = 0;
        for (const raw of lines) {
          const norm = normalizeFacebookLink(raw, { ignoreDots });
          if (norm.isValid && norm.normalizedKey) {
            keySet.add(norm.normalizedKey);
            valid++;
          }
        }
        setSrc1Keys(keySet);
        setSrc1TotalCount(valid);
        const nowTime = new Date().toLocaleTimeString('vi-VN');
        setSheetLastUpdated(nowTime);
        setSheetError(null);
        setSheetSuccessMsg(`Đã nạp ${valid.toLocaleString('vi-VN')} link từ tệp: ${file.name}`);
      } catch (err) {
        setSheetError('Lỗi đọc tệp tin: ' + String(err));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Handle local CSV/TXT upload for Source 2
  const handleSrc2FileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = (event.target?.result as string) || '';
        setSrc2Input((prev) => (prev ? prev + '\n' + text : text));
      } catch (err) {
        alert('Lỗi đọc tệp tin: ' + String(err));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Execute scan
  const handleScan = async () => {
    const rawLines = src2Input
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (rawLines.length === 0) {
      alert('Vui lòng dán ít nhất 1 link vào ô Nguồn 2.');
      return;
    }

    setIsScanning(true);

    // Auto-refresh sheet if enabled and sheet URL present
    let currentSrc1Keys = src1Keys;
    if (autoRefreshSheet && sheetUrl.trim()) {
      await fetchGoogleSheetData(sheetUrl, true);
    }

    // Give UI a microtask tick
    setTimeout(() => {
      const seenInSrc2 = new Set<string>();
      const _newLinks: ScanItem[] = [];
      const _dupInSrc1: ScanItem[] = [];
      const _dupInternal: ScanItem[] = [];
      const _invalidLines: ScanItem[] = [];

      for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        const norm: NormalizedResult = normalizeFacebookLink(line, { ignoreDots });

        if (!norm.isValid) {
          _invalidLines.push({
            raw: line,
            normalizedKey: '',
            type: norm.type,
            reason: norm.reason || 'Không nhận diện được link Facebook',
          });
          continue;
        }

        // Duplicate within Source 2
        if (seenInSrc2.has(norm.normalizedKey)) {
          _dupInternal.push({
            raw: line,
            normalizedKey: norm.normalizedKey,
            type: norm.type,
          });
          continue;
        }
        seenInSrc2.add(norm.normalizedKey);

        // Duplicate in Source 1
        if (currentSrc1Keys.has(norm.normalizedKey)) {
          _dupInSrc1.push({
            raw: line,
            normalizedKey: norm.normalizedKey,
            type: norm.type,
          });
        } else {
          _newLinks.push({
            raw: line,
            normalizedKey: norm.normalizedKey,
            type: norm.type,
          });
        }
      }

      setTotalSrc2Count(rawLines.length);
      setNewLinks(_newLinks);
      setDupInSrc1(_dupInSrc1);
      setDupInternal(_dupInternal);
      setInvalidLines(_invalidLines);
      setHasScanned(true);
      setIsScanning(false);
      setActiveTab('new');
    }, 20);
  };

  // Filtered items based on active tab & search
  const currentTabItems = useMemo(() => {
    let list: ScanItem[] = [];
    if (activeTab === 'new') list = newLinks;
    else if (activeTab === 'dup1') list = dupInSrc1;
    else if (activeTab === 'internal') list = dupInternal;
    else if (activeTab === 'invalid') list = invalidLines;

    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(
      (item) => item.raw.toLowerCase().includes(q) || item.normalizedKey.toLowerCase().includes(q)
    );
  }, [activeTab, newLinks, dupInSrc1, dupInternal, invalidLines, searchTerm]);

  // Copy current active tab results
  const handleCopyCurrent = () => {
    let listToCopy: ScanItem[] = [];
    if (activeTab === 'new') listToCopy = newLinks;
    else if (activeTab === 'dup1') listToCopy = dupInSrc1;
    else if (activeTab === 'internal') listToCopy = dupInternal;
    else if (activeTab === 'invalid') listToCopy = invalidLines;

    if (listToCopy.length === 0) {
      alert('Không có dữ liệu trong mục này để copy.');
      return;
    }

    const text = listToCopy.map((item) => item.raw).join('\n');
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedTab(true);
        setTimeout(() => setCopiedTab(false), 2000);
      })
      .catch(() => {
        // Fallback copy
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopiedTab(true);
        setTimeout(() => setCopiedTab(false), 2000);
      });
  };

  // Download results as .txt or .csv
  const handleDownload = (format: 'txt' | 'csv') => {
    if (newLinks.length === 0) {
      alert('Chưa có link mới để tải về.');
      return;
    }
    const dateStr = new Date().toISOString().slice(0, 10);
    if (format === 'txt') {
      const content = newLinks.map((i) => i.raw).join('\n');
      downloadFile(`facebook-link-moi-${dateStr}.txt`, content, 'text/plain;charset=utf-8');
    } else {
      const rows = ['"STT","Link Facebook Gốc","Mã Định Danh Chuẩn Hóa","Loại"'];
      newLinks.forEach((item, idx) => {
        const cleanRaw = item.raw.replace(/"/g, '""');
        rows.push(`"${idx + 1}","${cleanRaw}","${item.normalizedKey}","${item.type || ''}"`);
      });
      downloadFile(`facebook-link-moi-${dateStr}.csv`, rows.join('\n'), 'text/csv;charset=utf-8');
    }
  };

  // Download Standalone 1-file HTML
  const handleDownloadStandaloneHtml = () => {
    const html = generateStandaloneHtml();
    downloadFile('loc-trung-link-facebook.html', html, 'text/html;charset=utf-8');
  };

  // Sample data loader for quick testing
  const handleLoadSampleSrc2 = () => {
    const samples = [
      'https://www.facebook.com/BooBayBi.197',
      'https://www.facebook.com/Pinkychuty',
      'https://www.facebook.com/96lieu',
      'https://www.facebook.com/hoangngabk',
      'https://www.facebook.com/hip.dep.jai',
      'https://www.facebook.com/phuong.leha.10',
      'https://m.facebook.com/hoang.nga.bk', // test dot normalization
      'https://www.facebook.com/profile.php?id=100090449453794&mibextid=ZbWKwL', // test profile.php
      'https://facebook.com/100090449453794', // test numerical id
      'wwww.facebook.com/trag.cin', // test wwww typo
      'facebook.comchinagnil', // test missing slash typo
      'https://www.facebook.com/Pinkychuty?comment_id=123', // duplicate with query param
      'https://www.facebook.com/LinkMoiChuaCoTrongSheet.999',
      'https://www.facebook.com/TaiKhoanMoi12345',
      'https://www.facebook.com/profile.php?id=999888777666',
      'dòng này là chữ không phải link',
    ];
    setSrc2Input(samples.join('\n'));
  };

  // Normalizer test result for live debugging
  const previewTestResult = useMemo(() => {
    if (!previewTestUrl.trim()) return null;
    return normalizeFacebookLink(previewTestUrl, { ignoreDots });
  }, [previewTestUrl, ignoreDots]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 font-bold text-xl">
              f
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Lọc Trùng Link Facebook
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  <Sparkles className="w-3 h-3" /> Siêu tốc 50.000+ link
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tự động đọc Google Sheet • Nhận diện mọi biến thể link Facebook • 100% bảo mật trên trình duyệt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download standalone 1-file HTML */}
            <button
              onClick={handleDownloadStandaloneHtml}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-sm transition-all"
              title="Tải về file HTML đơn lẻ để mở trực tiếp trên máy không cần cài đặt gì"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden md:inline">Tải web 1 file HTML</span>
              <span className="md:hidden">File HTML</span>
            </button>

            {/* Help Button */}
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Hướng dẫn sử dụng & Mẹo Google Sheet"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title={darkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Source 1 & Source 2 Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NGUỒN 1: GOOGLE SHEET */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                      NGUỒN 1: Google Sheet
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Danh sách link Facebook đã có sẵn (Cột A)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${
                      src1TotalCount > 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        src1TotalCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                    {src1TotalCount.toLocaleString('vi-VN')} link
                  </span>
                </div>
              </div>

              {/* Sheet Input Box */}
              <div className="mt-4 flex flex-col gap-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Đường liên kết Google Sheet hoặc CSV:</span>
                  {sheetLastUpdated && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Cập nhật: {sheetLastUpdated}
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') fetchGoogleSheetData(sheetUrl);
                    }}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit hoặc link CSV xuất bản"
                    className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                  />
                  <button
                    onClick={() => fetchGoogleSheetData(sheetUrl)}
                    disabled={isSheetLoading}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSheetLoading ? 'animate-spin' : ''}`} />
                    <span>{isSheetLoading ? 'Đang nạp...' : 'Tải lại Sheet'}</span>
                  </button>
                </div>
              </div>

              {/* Status messages / Error handling */}
              {sheetError && (
                <div className="mt-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed font-medium">{sheetError}</div>
                  </div>
                  <div className="pl-6 flex flex-wrap gap-2 pt-1 border-t border-red-200/60 dark:border-red-900/40">
                    <button
                      onClick={() => setShowHelpModal(true)}
                      className="underline font-semibold hover:text-red-800 dark:hover:text-red-200"
                    >
                      👉 Xem cách xuất bản CSV 10 giây
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => src1FileInputRef.current?.click()}
                      className="underline font-semibold hover:text-red-800 dark:hover:text-red-200"
                    >
                      📁 Hoặc tải tệp CSV/TXT lên trực tiếp
                    </button>
                  </div>
                </div>
              )}

              {sheetSuccessMsg && !sheetError && (
                <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{sheetSuccessMsg}</span>
                </div>
              )}
            </div>

            {/* Alternative options for Source 1 */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span>Dự phòng khi mất mạng/CORS:</span>
                <input
                  type="file"
                  ref={src1FileInputRef}
                  onChange={handleSrc1FileUpload}
                  accept=".csv,.txt"
                  className="hidden"
                />
                <button
                  onClick={() => src1FileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <Upload className="w-3 h-3 text-blue-500" />
                  Nạp tệp CSV / TXT
                </button>
              </div>

              <button
                onClick={() => {
                  setManualSrc1Text(src1RawLinks.join('\n'));
                  setShowManualSrc1Modal(true);
                }}
                className="hover:underline text-blue-600 dark:text-blue-400 font-medium"
              >
                Xem danh sách ({src1TotalCount})
              </button>
            </div>
          </div>

          {/* NGUỒN 2: DANH SÁCH LINK MỚI CẦN KIỂM TRA */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                      NGUỒN 2: Danh sách link mới
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Dán hàng nghìn link Facebook vào đây (mỗi dòng một link)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {src2Input
                      ? `${src2Input.split(/\r?\n/).filter((l) => l.trim()).length.toLocaleString('vi-VN')} dòng`
                      : '0 dòng'}
                  </span>
                </div>
              </div>

              {/* Textarea */}
              <div className="mt-3 relative">
                <textarea
                  value={src2Input}
                  onChange={(e) => setSrc2Input(e.target.value)}
                  placeholder={`Ví dụ:
https://www.facebook.com/BooBayBi.197
https://www.facebook.com/Pinkychuty
https://www.facebook.com/profile.php?id=100090449453794
m.facebook.com/hoang.nga.bk
facebook.comchinagnil (link gõ thiếu / vẫn nhận dạng)`}
                  rows={8}
                  className="w-full px-3.5 py-3 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed transition-all resize-y"
                />
              </div>
            </div>

            {/* Actions for Source 2 */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={src2FileInputRef}
                  onChange={handleSrc2FileUpload}
                  accept=".csv,.txt"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => src2FileInputRef.current?.click()}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <Upload className="w-3 h-3 text-slate-500" />
                  Nhập file .txt
                </button>
                <button
                  type="button"
                  onClick={handleLoadSampleSrc2}
                  className="px-2.5 py-1 text-xs rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  Dán mẫu thử nghiệm
                </button>
              </div>

              <div className="flex items-center gap-2">
                {src2Input && (
                  <button
                    onClick={() => setSrc2Input('')}
                    className="px-3 py-1.5 text-xs rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xoá
                  </button>
                )}

                <button
                  onClick={handleScan}
                  disabled={isScanning || !src2Input.trim()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all cursor-pointer"
                >
                  <Search className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Đang quét...' : 'QUÉT LỌC TRÙNG'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Options & Normalization Settings Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Sliders className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
              Quy tắc chuẩn hoá link thông minh:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={ignoreDots}
                onChange={(e) => setIgnoreDots(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
              />
              <span>
                Bỏ qua dấu chấm trong tên tài khoản (Facebook coi{' '}
                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">
                  hoang.nga.bk
                </code>{' '}
                và{' '}
                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">
                  hoangngabk
                </code>{' '}
                là một)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={autoRefreshSheet}
                onChange={(e) => setAutoRefreshSheet(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
              />
              <span>Tự động tải lại Google Sheet mỗi lần bấm "Quét"</span>
            </label>
          </div>
        </div>

        {/* Statistics Metric Cards */}
        {hasScanned && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Metric 1 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Tổng link Nguồn 2
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {totalSrc2Count.toLocaleString('vi-VN')}
                </span>
                <span className="text-[11px] text-slate-400">100%</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Trùng lặp nội bộ Nguồn 2
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                  {dupInternal.length.toLocaleString('vi-VN')}
                </span>
                <span className="text-[11px] text-amber-500/80">
                  {totalSrc2Count > 0
                    ? `${((dupInternal.length / totalSrc2Count) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                Đã có trong Nguồn 1 (Bị loại)
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                  {dupInSrc1.length.toLocaleString('vi-VN')}
                </span>
                <span className="text-[11px] text-rose-500/80">
                  {totalSrc2Count > 0
                    ? `${((dupInSrc1.length / totalSrc2Count) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
            </div>

            {/* Metric 4 (Highlight) */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-950/40 dark:to-teal-950/40 border-2 border-emerald-500/50 dark:border-emerald-500/60 rounded-2xl p-4 shadow-md flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  LINK MỚI (CHỈ NGUỒN 2)
                </span>
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {newLinks.length.toLocaleString('vi-VN')}
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {totalSrc2Count > 0
                    ? `${((newLinks.length / totalSrc2Count) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Results Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {/* Header & Tabs */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab('new')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'new'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>Link Mới</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-xs font-bold ${
                    activeTab === 'new'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {newLinks.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('dup1')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'dup1'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>Đã có ở Nguồn 1</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-xs font-bold ${
                    activeTab === 'dup1'
                      ? 'bg-rose-700 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {dupInSrc1.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('internal')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'internal'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>Trùng lặp Nguồn 2</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-xs font-bold ${
                    activeTab === 'internal'
                      ? 'bg-amber-700 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {dupInternal.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('invalid')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'invalid'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>Không hợp lệ</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-xs font-bold ${
                    activeTab === 'invalid'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {invalidLines.length}
                </span>
              </button>
            </div>

            {/* Quick Actions & Export Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search in results */}
              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Lọc kết quả..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Copy button */}
              <button
                onClick={handleCopyCurrent}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                {copiedTab ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTab ? 'Đã copy!' : 'Copy danh sách'}</span>
              </button>

              {/* Download Buttons */}
              <button
                onClick={() => handleDownload('txt')}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Tải về file text mỗi link 1 dòng"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Xuất .txt</span>
              </button>

              <button
                onClick={() => handleDownload('csv')}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Xuất file CSV mở bằng Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span>Xuất .csv</span>
              </button>
            </div>
          </div>

          {/* List items rendering */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[520px] overflow-y-auto">
            {currentTabItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">
                <Search className="w-8 h-8 stroke-[1.5] text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium">
                  {hasScanned
                    ? 'Không có kết quả nào phù hợp với bộ lọc.'
                    : 'Chưa có kết quả. Nhập Google Sheet và bấm "QUÉT LỌC TRÙNG" để bắt đầu.'}
                </p>
              </div>
            ) : (
              currentTabItems.map((item, index) => {
                const href = /^https?:\/\//i.test(item.raw) ? item.raw : `https://${item.raw}`;
                return (
                  <div
                    key={index}
                    className="p-3 sm:px-5 sm:py-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-4 font-mono text-xs sm:text-sm"
                  >
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      <span className="text-xs text-slate-400 dark:text-slate-500 w-8 shrink-0 font-sans font-medium text-right">
                        {index + 1}.
                      </span>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
                        title={item.raw}
                      >
                        <span className="truncate">{item.raw}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-40 hover:opacity-100" />
                      </a>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.normalizedKey && (
                        <span
                          className="hidden md:inline-block px-2 py-0.5 text-[11px] rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono"
                          title="Mã định danh duy nhất sau khi chuẩn hoá"
                        >
                          {item.normalizedKey}
                        </span>
                      )}
                      {item.reason && (
                        <span className="px-2 py-0.5 text-[11px] rounded bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                          {item.reason}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* List Footer */}
          {currentTabItems.length > 0 && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>
                Hiển thị {currentTabItems.length.toLocaleString('vi-VN')} dòng
                {searchTerm && ` (đang lọc theo "${searchTerm}")`}
              </span>
              <button
                onClick={handleCopyCurrent}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Copy danh sách này
              </button>
            </div>
          )}
        </div>

        {/* Live Regex / Link Normalization Tester for quick debugging */}
        <div className="bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              🔬 Kiểm tra thử thuật toán chuẩn hoá link Facebook:
            </span>
            <span className="text-[11px] text-slate-500">
              Nhập bất kỳ dạng link nào để xem mã nhận diện
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={previewTestUrl}
              onChange={(e) => setPreviewTestUrl(e.target.value)}
              placeholder="Dán thử: https://www.facebook.com/profile.php?id=100090449453794 hoặc wwww.facebook.comtennguoidung"
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono text-xs focus:outline-none"
            />
          </div>
          {previewTestResult && (
            <div className="mt-2 p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
              <span className="font-semibold">Kết quả:</span>
              <span
                className={`font-bold ${
                  previewTestResult.isValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'
                }`}
              >
                {previewTestResult.isValid ? 'Hợp lệ' : 'Không hợp lệ'}
              </span>
              {previewTestResult.normalizedKey && (
                <span className="font-mono bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded text-blue-700 dark:text-blue-300">
                  Key: {previewTestResult.normalizedKey}
                </span>
              )}
              {previewTestResult.reason && (
                <span className="text-red-500">Lý do: {previewTestResult.reason}</span>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Manual Source 1 Inspect Modal */}
      {showManualSrc1Modal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Danh Sách Link Nguồn 1 ({src1RawLinks.length} dòng)
              </h3>
              <button
                onClick={() => setShowManualSrc1Modal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Bạn có thể xem hoặc dán chỉnh sửa trực tiếp danh sách link Nguồn 1 bên dưới:
            </p>

            <textarea
              value={manualSrc1Text}
              onChange={(e) => setManualSrc1Text(e.target.value)}
              rows={12}
              className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                {manualSrc1Text.split('\n').filter((l) => l.trim()).length} dòng
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowManualSrc1Modal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    const lines = manualSrc1Text
                      .split('\n')
                      .map((l) => l.trim())
                      .filter(Boolean);
                    setSrc1RawLinks(lines);
                    const kSet = new Set<string>();
                    let v = 0;
                    for (const r of lines) {
                      const n = normalizeFacebookLink(r, { ignoreDots });
                      if (n.isValid && n.normalizedKey) {
                        kSet.add(n.normalizedKey);
                        v++;
                      }
                    }
                    setSrc1Keys(kSet);
                    setSrc1TotalCount(v);
                    setShowManualSrc1Modal(false);
                    setSheetSuccessMsg(`Đã cập nhật thủ công ${v} link cho Nguồn 1.`);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Áp dụng thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guide / Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                Hướng Dẫn Sử Dụng & Kết Nối Google Sheet
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-4 leading-relaxed">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
                  📌 Cách 1: Xuất bản Google Sheet thành link CSV (Khuyên dùng - không bao giờ lỗi CORS):
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-slate-700 dark:text-slate-300">
                  <li>Mở Google Sheet của bạn trên trình duyệt.</li>
                  <li>
                    Vào menu: <strong>Tệp (File)</strong> &gt; <strong>Chia sẻ (Share)</strong> &gt;{' '}
                    <strong>Xuất bản lên web (Publish to the web)</strong>.
                  </li>
                  <li>
                    Ở phần định dạng (mặc định là "Trang web"), chọn đổi sang{' '}
                    <strong>Giá trị được phân tách bằng dấu phẩy (.csv)</strong>.
                  </li>
                  <li>
                    Bấm <strong>Xuất bản (Publish)</strong>, sau đó copy đường link được tạo và dán vào ô Nguồn 1.
                  </li>
                </ol>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  📌 Cách 2: Chia sẻ công khai trang tính:
                </p>
                <p>
                  Bấm nút <strong>Chia sẻ (Share)</strong> góc trên bên phải &gt; chuyển quyền truy cập chung thành{' '}
                  <strong>"Bất kỳ ai có đường liên kết" (Người xem)</strong> &gt; Copy link trang tính dán vào ô.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                <p className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                  🎯 Cách chuẩn hóa thông minh:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Tự động bỏ http/https, www, m, mbasic, fb.com, fb.me...</li>
                  <li>
                    Khắc phục lỗi gõ thiếu dấu / (vd: <code>facebook.comtennguoidung</code>) hoặc{' '}
                    <code>wwww.facebook.com</code>.
                  </li>
                  <li>
                    Đồng bộ link ID (<code>profile.php?id=123</code> và <code>facebook.com/123</code> và{' '}
                    <code>people/Ten/123</code> đều nhận diện chung 1 ID).
                  </li>
                  <li>
                    Tùy chọn bỏ qua dấu chấm username (<code>hoang.nga.bk</code> === <code>hoangngabk</code>).
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
