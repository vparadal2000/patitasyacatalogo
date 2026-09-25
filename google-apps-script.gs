const SHEET_NAME = 'Pedidos';
const NOTIFICATION_EMAIL = 'CAMBIA_AQUI_TU_CORREO';

function doPost(e) {
  try {
    const order = JSON.parse(e.postData.contents || '{}');
    validateOrder_(order);

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

    ensureHeaders_(sheet);

    const itemsText = order.items
      .map(item => `${item.quantity} x ${item.name} (${formatCLP_(item.subtotal)})`)
      .join(' | ');

    sheet.appendRow([
      new Date(),
      order.orderId,
      order.name,
      order.phone,
      order.address,
      order.paymentMethod,
      order.notes || '',
      itemsText,
      Number(order.total || 0),
      'Nuevo'
    ]);

    sendNotification_(order, itemsText);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, orderId: order.orderId }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error(error);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function validateOrder_(order) {
  if (!order.orderId) throw new Error('Falta orderId');
  if (!order.name) throw new Error('Falta nombre');
  if (!order.phone) throw new Error('Falta teléfono');
  if (!order.address) throw new Error('Falta dirección');
  if (!order.paymentMethod) throw new Error('Falta medio de pago');
  if (!Array.isArray(order.items) || !order.items.length) throw new Error('Pedido vacío');
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow([
    'Fecha',
    'N° pedido',
    'Nombre',
    'Teléfono',
    'Dirección',
    'Medio de pago',
    'Comentario',
    'Pedido',
    'Total productos',
    'Estado'
  ]);
  sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function sendNotification_(order, itemsText) {
  if (!NOTIFICATION_EMAIL || NOTIFICATION_EMAIL.includes('CAMBIA_AQUI')) return;

  const subject = `🐾 Nuevo pedido Patitas Ya — ${order.orderId}`;
  const body = [
    'Nuevo pedido recibido en Patitas Ya',
    '',
    `Pedido: ${order.orderId}`,
    `Nombre: ${order.name}`,
    `Teléfono: ${order.phone}`,
    `Dirección: ${order.address}`,
    `Medio de pago: ${order.paymentMethod}`,
    `Comentario: ${order.notes || '-'}`,
    '',
    'Productos:',
    itemsText.replaceAll(' | ', '\n'),
    '',
    `Total productos: ${formatCLP_(order.total)}`,
    '',
    'Revisa la pestaña "Pedidos" de tu Google Sheet para gestionar la solicitud.'
  ].join('\n');

  MailApp.sendEmail(NOTIFICATION_EMAIL, subject, body);
}

function formatCLP_(value) {
  return '$' + Number(value || 0).toLocaleString('es-CL');
}
