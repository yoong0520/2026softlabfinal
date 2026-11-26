/**
 * 2026년 고등교육 에듀테크 소프트랩 성과 포럼 참가확인증 · 발급번호 부여 전용
 * (메일 발송 없음. 번호를 순서대로 매기고 「발급대장」 시트에 기록만 합니다.)
 *
 *  - 참가자가 발급 페이지에서 성명·소속·이메일을 보내면
 *  - 2026-001, 002… 순서로 번호를 부여하고 시트에 기록한 뒤 번호를 돌려줍니다.
 *  - 같은 이메일이 다시 오면 새 번호를 만들지 않고 처음 번호를 돌려줍니다.
 *
 * 설치
 *  1) 구글 시트 「2026 소프트랩 성과 포럼 참가확인증 발급대장」을 만들고 주소의 /d/ 와 /edit 사이 값을 SPREADSHEET_ID 에 넣습니다.
 *  2) 배포 → 새 배포 → 유형 「웹 앱」, 실행 주체 「나」, 액세스 권한 「모든 사용자」
 *  3) 발급된 웹 앱 URL(…/exec)을 index.html 의 APPS_SCRIPT_URL 에 넣습니다.
 *  코드를 고친 뒤에는 「배포 관리 → 새 버전」으로 배포해야 반영됩니다(주소 유지).
 */

var CONFIG = {
  SPREADSHEET_ID: '1Ma5xGsb5_aqNIdtaJxacTcO0CVUDaJ3M7m1PDEsLYYQ',  // 유은님 드라이브 「2026 소프트랩 성과 포럼 참가확인증 발급대장」
  SHEET_NAME: '발급대장',
  YEAR: '2026'
};

function doGet(e) {
  var sheet = getSheet_();
  return json_({ ok: true, service: 'Softlab forum certificate', issued: Math.max(sheet.getLastRow() - 1, 0) });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var body = {};
    try { body = JSON.parse(e.postData.contents || '{}'); } catch (err) { return json_({ ok: false, message: '요청 형식이 올바르지 않습니다.' }); }

    var name = clean_(body.name), org = clean_(body.org), email = clean_(body.email).toLowerCase();
    if (!name || !org || !email) return json_({ ok: false, message: '성명, 소속, 이메일을 모두 입력해 주세요.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json_({ ok: false, message: '이메일 주소 형식이 올바르지 않습니다.' });
    if (name.length > 40 || org.length > 80 || email.length > 120) return json_({ ok: false, message: '성명, 소속 또는 이메일이 너무 깁니다.' });

    var sheet = getSheet_();
    var found = findByEmail_(sheet, email);
    if (found) {
      sheet.getRange(found.row, 6).setValue(Number(sheet.getRange(found.row, 6).getValue() || 1) + 1);
      sheet.getRange(found.row, 7).setValue(stamp_(new Date()));
      return json_({ ok: true, number: found.number, name: found.name, org: found.org, issuedAt: found.issuedAt, resent: true });
    }
    var number = CONFIG.YEAR + '-' + pad3_(nextSeq_(sheet));
    var issuedAt = stamp_(new Date());
    // 맨 앞에 작은따옴표를 붙여 문자 그대로 기록(수식으로 해석되지 않도록)
    sheet.appendRow([number, text_(name), text_(org), text_(email), issuedAt, 1, issuedAt]);
    return json_({ ok: true, number: number, name: name, org: org, issuedAt: issuedAt, resent: false });
  } catch (err) {
    return json_({ ok: false, message: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

function getSheet_() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName(CONFIG.SHEET_NAME);
  }
  if (String(sheet.getRange(1, 1).getValue()) !== '발급번호') {
    sheet.getRange(1, 1, 1, 7).setValues([['발급번호', '성명', '소속', '이메일', '최초 발급일시', '발급 횟수', '최근 발급일시']]);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#e8eef9');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 7, 160);
  }
  return sheet;
}

function findByEmail_(sheet, email) {
  var last = sheet.getLastRow();
  if (last < 2) return null;
  var rows = sheet.getRange(2, 1, last - 1, 5).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][3]).trim().toLowerCase() === email) {
      return { row: i + 2, number: String(rows[i][0]), name: String(rows[i][1]), org: String(rows[i][2]), issuedAt: String(rows[i][4]) };
    }
  }
  return null;
}

function nextSeq_(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return 1;
  var nums = sheet.getRange(2, 1, last - 1, 1).getValues(), max = 0;
  for (var i = 0; i < nums.length; i++) { var m = String(nums[i][0]).match(/-(\d+)$/); if (m) max = Math.max(max, parseInt(m[1], 10)); }
  return max + 1;
}

function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function clean_(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
function text_(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }
function pad3_(n) { n = String(n); while (n.length < 3) n = '0' + n; return n; }
function stamp_(d) { return Utilities.formatDate(d, 'Asia/Seoul', 'yyyy. MM. dd. HH:mm'); }
