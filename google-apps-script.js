// ====================================================
// COLE ESTE CODIGO NO GOOGLE APPS SCRIPT
// (Extensoes > Apps Script dentro do Google Sheets)
// ====================================================

const SHEET_NAME = 'Auditorias';

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });

  return ContentService.createTextOutput(JSON.stringify(rows))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const body = JSON.parse(e.postData.contents);
  const action = body.action;

  if (action === 'add') {
    const row = [body.data.id, body.data.node, body.data.programa, body.data.item, body.data.descricao, body.data.status, body.data.comentarios];
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ success: true, action: 'add' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'update') {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == body.data.id) {
        sheet.getRange(i + 1, 2).setValue(body.data.node);
        sheet.getRange(i + 1, 3).setValue(body.data.programa);
        sheet.getRange(i + 1, 4).setValue(body.data.item);
        sheet.getRange(i + 1, 5).setValue(body.data.descricao);
        sheet.getRange(i + 1, 6).setValue(body.data.status);
        sheet.getRange(i + 1, 7).setValue(body.data.comentarios);
        break;
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, action: 'update' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'delete') {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == body.data.id) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, action: 'delete' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Acao invalida' }))
    .setMimeType(ContentService.MimeType.JSON);
}
