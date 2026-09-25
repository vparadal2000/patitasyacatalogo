# Patitas Ya — registro de pedidos en Google Sheets

La tienda pública sigue funcionando como sitio estático en GitHub Pages. Para registrar los pedidos y recibir una notificación se usa un Google Apps Script vinculado a una planilla.

## 1. Crear la planilla

1. Crea una Google Sheet nueva, por ejemplo `Pedidos Patitas Ya`.
2. En la planilla ve a **Extensiones → Apps Script**.
3. Borra el código de ejemplo y pega todo el contenido de `google-apps-script.gs`.
4. En la primera línea cambia:

```javascript
const NOTIFICATION_EMAIL = 'CAMBIA_AQUI_TU_CORREO';
```

por el correo donde quieres recibir los avisos.

## 2. Publicar el receptor de pedidos

1. En Apps Script selecciona **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Ejecutar como: **Yo**.
4. Quién tiene acceso: **Cualquier usuario**.
5. Autoriza los permisos solicitados.
6. Copia la URL que termina en `/exec`.

## 3. Conectar la web

En `data/config.json` reemplaza:

```json
"orderEndpoint": "PEGA_AQUI_LA_URL_DE_TU_GOOGLE_APPS_SCRIPT"
```

por la URL `/exec` copiada en el paso anterior.

Ejemplo:

```json
"orderEndpoint": "https://script.google.com/macros/s/XXXXXXXXXXXX/exec"
```

## 4. Medios de pago

También puedes cambiar las opciones visibles al cliente en `data/config.json`:

```json
"paymentMethods": [
  "Transferencia bancaria",
  "Efectivo",
  "Coordinar al confirmar"
]
```

## 5. Qué queda registrado

Cada pedido crea una fila con:

- Fecha
- N° de pedido
- Nombre
- Teléfono
- Dirección
- Medio de pago
- Comentario
- Productos y cantidades
- Total de productos
- Estado inicial `Nuevo`

Además, Apps Script envía un correo con los mismos datos.

## 6. Archivos a reemplazar en tu repositorio

Reemplaza solamente:

```text
index.html
assets/css/styles.css
assets/js/app.js
data/config.json
```

`data/productos.json` se incluye solo para que puedas probar esta versión con tu catálogo actual. Tus imágenes en `assets/images/` no se modifican.

## Importante

El formulario guarda un respaldo local de los últimos pedidos enviados en el navegador del cliente, pero el registro operativo es la Google Sheet. Antes de publicar definitivamente, haz un pedido de prueba y confirma que aparece en la planilla y llega el correo de aviso.
