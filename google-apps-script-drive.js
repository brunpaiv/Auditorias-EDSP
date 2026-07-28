// ====================================================
// ADICIONE ESTE CODIGO NO FINAL DO SEU GOOGLE APPS SCRIPT
// (Extensoes > Apps Script dentro do Google Sheets)
// Depois de adicionar, faca uma NOVA IMPLANTACAO:
// Implantar > Gerenciar implantacoes > Editar (lapis) > Nova versao > Implantar
// ====================================================

// Adicione dentro da funcao doPost, antes do ultimo return de "Acao invalida":
//
//   if (action === 'uploadImage') {
//     var folder = getOrCreateFolder('Evidencias_EDSP');
//     var imageData = body.data.image;
//     var fileName = body.data.fileName || 'evidencia.jpg';
//     var itemId = body.data.itemId;
//     
//     var blob = Utilities.newBlob(Utilities.base64Decode(imageData), 'image/jpeg', fileName);
//     var file = folder.createFile(blob);
//     file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
//     
//     var fileUrl = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w400';
//     
//     return ContentService.createTextOutput(JSON.stringify({ 
//       success: true, 
//       action: 'uploadImage',
//       url: fileUrl,
//       itemId: itemId
//     })).setMimeType(ContentService.MimeType.JSON);
//   }
//
// E adicione esta funcao auxiliar fora do doPost:

function getOrCreateFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

// ====================================================
// CODIGO COMPLETO DO doPost ATUALIZADO (SUBSTITUA O SEU):
// ====================================================

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Auditorias');
  const body = JSON.parse(e.postData.contents);
  const action = body.action;

  if (action === 'add') {
    const row = [body.data.id, body.data.node, body.data.programa, body.data.item, body.data.descricao, body.data.status, body.data.responsavel, body.data.comentarios];
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
        sheet.getRange(i + 1, 7).setValue(body.data.responsavel);
        sheet.getRange(i + 1, 8).setValue(body.data.comentarios);
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
    var itemId = body.data.itemId;
    
    var blob = Utilities.newBlob(Utilities.base64Decode(imageData), 'image/jpeg', fileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileUrl = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w400';
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      action: 'uploadImage',
      url: fileUrl,
      itemId: itemId
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Acao invalida' }))
    .setMimeType(ContentService.MimeType.JSON);
}
