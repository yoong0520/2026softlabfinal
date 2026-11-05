/**
 * 실증 결과보고서 제출 수신기 (Google Apps Script 웹 앱)
 * - 사이트의 「사업단에 제출」 버튼이 PDF·DOCX를 이 스크립트로 보내면,
 *   실증 Track에 맞는 구글 드라이브 폴더에 저장하고 「제출 현황」 시트에 한 줄을 기록함
 * - 배포: "웹 앱" / 실행 주체: 나(유은님) / 액세스 권한: 모든 사용자
 */
var ROOT_FOLDER_ID = "1xDrHzoQpVWPf6aJBv9OcrZTXxkFhoRsW"; // 2026 소프트랩 실증 수업 결과보고서 제출함
var TRACK_FOLDERS = {
  "Track 1 신규 개발":   "1o3DMMbhii7MNDqn86OSy-y2QFE0y6k_D",
  "Track 2 신규 심화":   "1lhlr1f5a5xbYbC9O3DYd6XaYy84_SCkj",
  "Track 2 기개발 심화": "1-5slQIKaI9ruz7nhxyrO-pJAAg5qrwr2",
  "기타 에듀테크":       "1O5yaYQYb_Sw8BDAPqiLKK-8fQTW33bOz"
};
var UNSORTED_FOLDER_ID = "1HzoDaKQ540wZA0UFZONBvGgyywIFYX9v"; // 미분류(Track 미선택)
var LOG_SHEET_ID = "1Bp228jIXvJrWhyUp7cd4NpKEbch7jB880uwUJuoZi7Y"; // 실증 결과보고서 제출 현황
var MAX_BYTES = 25 * 1024 * 1024;

// ---- 수업운영 컨설팅(교수자 자가진단 → 컨설턴트 검토) ----
var CONSULT_REQ_FOLDER_ID = "129sbRsDgaGedlG4aWVngO6YJ0shFAFrg";   // 1_컨설팅 요청(교수자 자가진단)
var CONSULT_RES_FOLDER_ID = "10dkmzkQEOF6nWFfOBJHrQpJI-VFtGyeX";   // 2_컨설팅 결과(컨설턴트 검토)
var CONSULT_DATA_FOLDER_ID = "1qWY3KpMTE1IetfUbwMot7AP9YJU9m6_k";  // 9_데이터(자동 저장, 수정 금지)
var CONSULT_LOG_SHEET_ID = "1mfXnWXz68eK1ues_ZFxWbMLSVY76xjUITVDgYSTzuvU"; // 수업운영 컨설팅 현황

function doGet(e) {
  var code = e && e.parameter && e.parameter.code;
  if (code) return out(loadConsult(String(code).trim().toUpperCase()));
  return out({ ok: true, message: "실증 결과보고서 제출 수신기가 동작 중입니다" });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents || "{}");
    if (data.kind === "consult-request" || data.kind === "consult-result") return out(saveConsult(data));
    if (!data.files || !data.files.length) return out({ ok: false, message: "파일이 없습니다" });

    var folderId = TRACK_FOLDERS[data.track] || UNSORTED_FOLDER_ID;
    var folder = DriveApp.getFolderById(folderId);
    var stamp = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyyMMdd_HHmm");
    var saved = [];

    for (var i = 0; i < data.files.length; i++) {
      var f = data.files[i];
      var bytes = Utilities.base64Decode(f.base64);
      if (bytes.length > MAX_BYTES) return out({ ok: false, message: "파일이 너무 큽니다(25MB 초과)" });
      var name = safeName(f.filename || ("보고서_" + stamp));
      // 같은 이름이 이미 있으면 제출 시각을 붙여 보존(이전 제출본을 덮어쓰지 않음)
      if (folder.getFilesByName(name).hasNext()) {
        var dot = name.lastIndexOf(".");
        name = dot > 0 ? name.slice(0, dot) + "_" + stamp + name.slice(dot) : name + "_" + stamp;
      }
      var file = folder.createFile(Utilities.newBlob(bytes, f.mime || "application/octet-stream", name));
      saved.push({ name: name, url: file.getUrl() });
    }

    appendLog(data, saved);
    return out({ ok: true, folder: folder.getName(), files: saved });
  } catch (err) {
    return out({ ok: false, message: "저장 중 오류: " + err });
  }
}

function appendLog(data, saved) {
  try {
    var sh = SpreadsheetApp.openById(LOG_SHEET_ID).getSheets()[0];
    var now = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm");
    var m = data.meta || {};
    for (var i = 0; i < saved.length; i++) {
      sh.appendRow([now, data.track || "(미선택)", m.course || "", m.prof || "", m.dept || "", m.cw || "", m.vendor || "", m.weeks || "", saved[i].name, saved[i].url]);
    }
  } catch (e) { /* 기록 실패는 제출 자체를 막지 않음 */ }
}

function safeName(n) {
  return String(n).replace(/[\\/:*?"<>|]/g, "_").slice(0, 120);
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ================= 수업운영 컨설팅 =================
function newCode() {
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", c = "";
  for (var i = 0; i < 6; i++) c += chars.charAt(Math.floor(Math.random() * chars.length));
  return c;
}
function findData(code, prefix) {
  var folder = DriveApp.getFolderById(CONSULT_DATA_FOLDER_ID);
  var it = folder.getFilesByName(prefix + "_" + code + ".json");
  return it.hasNext() ? it.next() : null;
}
function saveConsult(data) {
  var isReq = data.kind === "consult-request";
  var code = isReq ? (data.code && findData(String(data.code).toUpperCase(), "req") ? String(data.code).toUpperCase() : newCode()) : String(data.code || "").trim().toUpperCase();
  if (!isReq && !findData(code, "req")) return { ok: false, message: "접수 코드 " + code + "에 해당하는 교수자 자가진단이 없습니다" };
  var dataFolder = DriveApp.getFolderById(CONSULT_DATA_FOLDER_ID);
  var prefix = isReq ? "req" : "res";
  var payload = JSON.stringify({ code: code, kind: data.kind, savedAt: new Date().toISOString(), meta: data.meta || {}, data: data.data || {} });
  var old = findData(code, prefix);
  if (old) old.setContent(payload); else dataFolder.createFile(prefix + "_" + code + ".json", payload, "application/json");

  var fileFolder = DriveApp.getFolderById(isReq ? CONSULT_REQ_FOLDER_ID : CONSULT_RES_FOLDER_ID);
  var stamp = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyyMMdd_HHmm");
  var saved = [];
  (data.files || []).forEach(function (f) {
    var bytes = Utilities.base64Decode(f.base64);
    if (bytes.length > MAX_BYTES) return;
    var name = safeName(f.filename || (prefix + "_" + code));
    if (fileFolder.getFilesByName(name).hasNext()) {
      var dot = name.lastIndexOf(".");
      name = dot > 0 ? name.slice(0, dot) + "_" + stamp + name.slice(dot) : name + "_" + stamp;
    }
    var file = fileFolder.createFile(Utilities.newBlob(bytes, f.mime || "application/octet-stream", name));
    saved.push({ name: name, url: file.getUrl() });
  });
  try {
    var sh = SpreadsheetApp.openById(CONSULT_LOG_SHEET_ID).getSheets()[0];
    var now = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm");
    var m = data.meta || {};
    var rows = saved.length ? saved : [{ name: "", url: "" }];
    rows.forEach(function (sv) {
      sh.appendRow([now, isReq ? "자가진단 제출" : "컨설팅 결과 제출", code, m.track || "", m.course || "", m.prof || "", m.dept || "", m.cw || "", m.consultant || "", m.avg || "", sv.name, sv.url]);
    });
  } catch (err) {}
  return { ok: true, code: code, folder: fileFolder.getName(), files: saved };
}
function loadConsult(code) {
  if (!code) return { ok: false, message: "접수 코드가 없습니다" };
  var req = findData(code, "req");
  if (!req) return { ok: false, message: "접수 코드 " + code + "에 해당하는 자가진단이 없습니다. 코드를 확인해 주세요" };
  var res = findData(code, "res");
  var o = { ok: true, code: code, request: JSON.parse(req.getBlob().getDataAsString()) };
  if (res) o.result = JSON.parse(res.getBlob().getDataAsString());
  return o;
}
