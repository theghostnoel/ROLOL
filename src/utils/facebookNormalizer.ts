/**
 * Facebook link normalization and Google Sheet parsing utilities.
 */

export interface NormalizedResult {
  original: string;
  normalizedKey: string;
  isValid: boolean;
  type: 'profile_id' | 'username' | 'group' | 'page' | 'other' | 'invalid';
  reason?: string;
}

export interface NormalizerOptions {
  ignoreDots?: boolean; // Coi tên có dấu chấm và không dấu chấm là một (vd: hoang.ngan.bk == hoangnganbk)
}

/**
 * Normalizes a Facebook link into a canonical identifier key for exact duplicate matching.
 */
export function normalizeFacebookLink(raw: string, options: NormalizerOptions = {}): NormalizedResult {
  const { ignoreDots = false } = options;
  if (!raw || typeof raw !== 'string') {
    return { original: raw || '', normalizedKey: '', isValid: false, type: 'invalid', reason: 'Dòng trống' };
  }

  let str = raw.trim();
  // Strip control chars & zero-width spaces
  str = str.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

  if (!str) {
    return { original: raw, normalizedKey: '', isValid: false, type: 'invalid', reason: 'Dòng trống' };
  }

  // Quick discard for obvious non-links / non-FB (e.g. comments, plain sentences without fb)
  const lower = str.toLowerCase();

  // If missing protocol, prepend https:// for proper parsing if needed,
  // or handle typo domains like "wwww.facebook.com" or "facebook.comten.nguoi.dung"
  let sanitized = str;

  // Fix common typo: multiple w's like wwww.facebook.com -> www.facebook.com
  sanitized = sanitized.replace(/^https?:\/\/w{4,}\./i, 'https://www.');
  sanitized = sanitized.replace(/^w{4,}\./i, 'www.');

  // Fix typo missing slash after facebook.com / fb.com:
  // e.g. "https://facebook.comten.nguoi.dung" or "facebook.comten.nguoi.dung"
  // Match facebook.com or fb.com immediately followed by alphanumeric or dot without slash
  sanitized = sanitized.replace(/(https?:\/\/)?((?:[a-z0-9_-]+\.)?(?:facebook\.com|fb\.com))([a-zA-Z0-9_.])/i, (match, proto, domain, nextChar) => {
    const p = proto || 'https://';
    return `${p}${domain}/${nextChar}`;
  });

  // Verify that it is related to Facebook
  const isFbDomain = /(?:^|\/\/)(?:[a-zA-Z0-9_-]+\.)?(?:facebook\.com|fb\.com|fb\.watch|fb\.me)(?:[:/]|$)/i.test(sanitized);
  if (!isFbDomain) {
    // Check if it's a standalone profile.php?id=12345 without domain
    if (/^profile\.php\?id=\d+/i.test(sanitized)) {
      sanitized = `https://www.facebook.com/${sanitized}`;
    } else {
      return {
        original: raw,
        normalizedKey: '',
        isValid: false,
        type: 'invalid',
        reason: 'Không phải đường dẫn Facebook hợp lệ'
      };
    }
  }

  // Prepend protocol if missing
  if (!/^https?:\/\//i.test(sanitized)) {
    sanitized = 'https://' + sanitized;
  }

  try {
    const url = new URL(sanitized);
    const searchParams = url.searchParams;

    // Remove hash/fragment
    url.hash = '';

    // Check 1: profile.php?id=123456789
    if (url.pathname.includes('/profile.php')) {
      const idParam = searchParams.get('id');
      if (idParam && /^\d+$/.test(idParam.trim())) {
        return {
          original: raw,
          normalizedKey: `id:${idParam.trim()}`,
          isValid: true,
          type: 'profile_id',
        };
      }
    }

    // Check 2: /people/Tên-Người-Dùng/100090449453794/
    const peopleMatch = url.pathname.match(/\/people\/[^/]+\/(\d+)/i);
    if (peopleMatch && peopleMatch[1]) {
      return {
        original: raw,
        normalizedKey: `id:${peopleMatch[1]}`,
        isValid: true,
        type: 'profile_id',
      };
    }

    // Check 3: /user/123456789/
    const userMatch = url.pathname.match(/\/user\/(\d+)/i);
    if (userMatch && userMatch[1]) {
      return {
        original: raw,
        normalizedKey: `id:${userMatch[1]}`,
        isValid: true,
        type: 'profile_id',
      };
    }

    // Check 4: /groups/123456789 or /groups/group_name
    const groupMatch = url.pathname.match(/\/groups\/([^/?#]+)/i);
    if (groupMatch && groupMatch[1]) {
      let gName = groupMatch[1].toLowerCase();
      if (ignoreDots) gName = gName.replace(/\./g, '');
      return {
        original: raw,
        normalizedKey: `group:${gName}`,
        isValid: true,
        type: 'group',
      };
    }

    // Check 5: /pages/name/123456789
    const pagesMatch = url.pathname.match(/\/pages\/[^/]+\/(\d+)/i);
    if (pagesMatch && pagesMatch[1]) {
      return {
        original: raw,
        normalizedKey: `page:${pagesMatch[1]}`,
        isValid: true,
        type: 'page',
      };
    }

    // Check 6: Clean pathname
    // Remove leading and trailing slashes
    let pathname = url.pathname.replace(/^\/+|\/+$/g, '');

    // Skip technical endpoints if not useful
    const ignoredPaths = ['home.php', 'login.php', 'sharer.php', 'help', 'settings', 'messages', 'notifications', 'gaming', 'marketplace', 'watch'];
    if (ignoredPaths.includes(pathname.toLowerCase())) {
      return {
        original: raw,
        normalizedKey: '',
        isValid: false,
        type: 'invalid',
        reason: 'Đường dẫn hệ thống không phải profile/trang cá nhân',
      };
    }

    // If pathname has multiple segments like username/posts/123, extract the root username
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
      return {
        original: raw,
        normalizedKey: '',
        isValid: false,
        type: 'invalid',
        reason: 'Trang chủ Facebook, không có tên tài khoản hay ID',
      };
    }

    let rootSegment = segments[0];

    // If first segment is 'p' (e.g. /p/username/), take the next segment
    if (rootSegment.toLowerCase() === 'p' && segments.length > 1) {
      rootSegment = segments[1];
    }

    // Normalize username:
    // Facebook usernames are alphanumeric with optional periods
    let username = rootSegment.toLowerCase();

    // Check if it's pure numeric ID in path: e.g. facebook.com/100090449453794
    if (/^\d{8,}$/.test(username)) {
      return {
        original: raw,
        normalizedKey: `id:${username}`,
        isValid: true,
        type: 'profile_id',
      };
    }

    if (ignoreDots) {
      username = username.replace(/\./g, '');
    }

    return {
      original: raw,
      normalizedKey: `user:${username}`,
      isValid: true,
      type: 'username',
    };
  } catch {
    // If URL constructor fails, attempt regex fallback
    return fallbackRegexExtraction(raw, sanitized, ignoreDots);
  }
}

/**
 * Fallback regex parsing when URL constructor throws on malformed strings
 */
function fallbackRegexExtraction(raw: string, sanitized: string, ignoreDots: boolean): NormalizedResult {
  try {
    // Check profile.php?id=(\d+)
    const idMatch = sanitized.match(/profile\.php\?[^#]*\bid=(\d+)/i);
    if (idMatch && idMatch[1]) {
      return {
        original: raw,
        normalizedKey: `id:${idMatch[1]}`,
        isValid: true,
        type: 'profile_id',
      };
    }

    // Check /people/.../(\d+)
    const peopleMatch = sanitized.match(/\/people\/[^/?#]+\/(\d+)/i);
    if (peopleMatch && peopleMatch[1]) {
      return {
        original: raw,
        normalizedKey: `id:${peopleMatch[1]}`,
        isValid: true,
        type: 'profile_id',
      };
    }

    // Check simple domain/username pattern
    const userMatch = sanitized.match(/(?:facebook\.com|fb\.com)\/([a-zA-Z0-9_.-]+)/i);
    if (userMatch && userMatch[1]) {
      let username = userMatch[1].toLowerCase().replace(/[/?#].*$/, '');
      if (/^\d{8,}$/.test(username)) {
        return {
          original: raw,
          normalizedKey: `id:${username}`,
          isValid: true,
          type: 'profile_id',
        };
      }
      if (ignoreDots) {
        username = username.replace(/\./g, '');
      }
      return {
        original: raw,
        normalizedKey: `user:${username}`,
        isValid: true,
        type: 'username',
      };
    }
  } catch {
    // Ignore fallback failures
  }

  return {
    original: raw,
    normalizedKey: '',
    isValid: false,
    type: 'invalid',
    reason: 'Định dạng link không hợp lệ',
  };
}

/**
 * Parses a Google Sheet share/view URL or published link into direct CSV fetch URLs.
 */
export function parseGoogleSheetUrl(url: string): {
  exportCsvUrl: string;
  gvizUrl: string;
  sheetId?: string;
  gid?: string;
} | null {
  if (!url || typeof url !== 'string') return null;
  const str = url.trim();

  // If user pasted a direct CSV published URL, e.g.:
  // https://docs.google.com/spreadsheets/d/e/.../pub?output=csv
  if (str.includes('/pub') && str.includes('output=csv')) {
    return {
      exportCsvUrl: str,
      gvizUrl: str,
    };
  }

  // Match /spreadsheets/d/{ID}
  const idMatch = str.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!idMatch || !idMatch[1]) {
    // Check if it's already an export link
    if (str.includes('export?format=csv') || str.includes('gviz/tq?tqx=out:csv')) {
      return { exportCsvUrl: str, gvizUrl: str };
    }
    return null;
  }

  const sheetId = idMatch[1];

  // Extract gid if present
  let gid = '0';
  const gidMatch = str.match(/[#&?]gid=([0-9]+)/);
  if (gidMatch && gidMatch[1]) {
    gid = gidMatch[1];
  }

  const exportCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;

  return {
    exportCsvUrl,
    gvizUrl,
    sheetId,
    gid,
  };
}

/**
 * Parses CSV or plain text lines, specifically reading Column A (first column).
 * Handles quoted cells with embedded commas or newlines.
 */
export function parseCsvColumnA(text: string): string[] {
  if (!text) return [];

  const results: string[] = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine.trim()) continue;

    // Fast path: if line has no quote or comma, the whole line is column A
    if (!rawLine.includes(',') && !rawLine.includes('"') && !rawLine.includes('\t')) {
      const val = rawLine.trim();
      if (val) results.push(val);
      continue;
    }

    // Extract first cell (Column A)
    let cellA = '';
    let inQuotes = false;
    let idx = 0;

    // Check if starts with a quote
    if (rawLine.startsWith('"')) {
      inQuotes = true;
      idx = 1;
      while (idx < rawLine.length) {
        if (rawLine[idx] === '"') {
          if (idx + 1 < rawLine.length && rawLine[idx + 1] === '"') {
            cellA += '"';
            idx += 2;
          } else {
            // closing quote
            idx++;
            break;
          }
        } else {
          cellA += rawLine[idx];
          idx++;
        }
      }
    } else {
      // cell up to first comma or tab
      const commaIdx = rawLine.indexOf(',');
      const tabIdx = rawLine.indexOf('\t');
      let delimiterIdx = -1;
      if (commaIdx !== -1 && tabIdx !== -1) {
        delimiterIdx = Math.min(commaIdx, tabIdx);
      } else if (commaIdx !== -1) {
        delimiterIdx = commaIdx;
      } else {
        delimiterIdx = tabIdx;
      }

      if (delimiterIdx !== -1) {
        cellA = rawLine.slice(0, delimiterIdx);
      } else {
        cellA = rawLine;
      }
    }

    cellA = cellA.trim();
    if (cellA) {
      results.push(cellA);
    }
  }

  return results;
}

/**
 * Downloads a string as a text or csv file.
 */
export function downloadFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
