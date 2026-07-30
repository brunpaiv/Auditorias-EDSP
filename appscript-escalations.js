// ====================================================
// ADICIONE ESTE CODIGO NO APPS SCRIPT DA SUA PLANILHA
// (junto com o codigo que ja existe das Auditorias)
// ====================================================
// 
// ANTES: Crie uma nova aba na planilha chamada "Escalations"
// com os cabecalhos na linha 1:
// id | week | cta | ticket_id | tbr | id_motorista | node | regional | data | prazo_retorno | problem_type | obs
//
// DEPOIS: Adicione o trecho abaixo DENTRO da funcao doPost,
// antes do ultimo "return" de "Acao invalida":
//
//   if (action === 'addEscalation') {
//     const escSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Escalations');
//     const lastRow = escSheet.getLastRow();
//     const newId = lastRow > 0 ? lastRow : 1;
//     const d = body.data;
//     const row = [newId, d.week, d.cta, d.ticket_id, d.tbr, d.id_motorista, d.node, d.regional, d.data_evento, d.prazo_retorno || '', d.problem_type, d.obs];
//     escSheet.appendRow(row);
//     return ContentService.createTextOutput(JSON.stringify({ success: true, action: 'addEscalation' }))
//       .setMimeType(ContentService.MimeType.JSON);
//   }
//
// ====================================================
// CODIGO COMPLETO DO APPS SCRIPT (SUBSTITUA TUDO):
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
    const row = [body.data.id, body.data.node, body.data.programa, body.data.item, body.data.descricao, body.data.status, body.data.comentarios, ''];
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

  if (action === 'uploadImage') {
    var folder = getOrCreateFolder('Evidencias_EDSP');
    var imageData = body.data.image;
    var fileName = body.data.fileName || 'evidencia.jpg';
    var itemId = Number(body.data.itemId);

    var blob = Utilities.newBlob(Utilities.base64Decode(imageData), 'image/jpeg', fileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileUrl = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w400';

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (Number(data[i][0]) == itemId) {
        var existing = data[i][7] || '';
        var newValue = existing ? existing + '|' + fileUrl : fileUrl;
        sheet.getRange(i + 1, 8).setValue(newValue);
        break;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      action: 'uploadImage',
      url: fileUrl,
      itemId: itemId
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'updateEvidencias') {
    var itemId = Number(body.data.id);
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (Number(data[i][0]) == itemId) {
        sheet.getRange(i + 1, 8).setValue(body.data.evidencias);
        break;
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, action: 'updateEvidencias' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'addEscalation') {
    const escSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Escalations');
    const lastRow = escSheet.getLastRow();
    const newId = lastRow > 0 ? lastRow : 1;
    const d = body.data;
    const row = [newId, d.week, d.cta, d.ticket_id, d.tbr, d.id_motorista, d.node, d.regional, d.data_evento, d.prazo_retorno || '', d.problem_type, d.obs];
    escSheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ success: true, action: 'addEscalation' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Acao invalida' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}
