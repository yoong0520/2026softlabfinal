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

function doGet() {
  return out({ ok: true, message: "실증 결과보고서 제출 수신기가 동작 중입니다" });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents || "{}");
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
