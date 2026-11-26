# WhatsApp Automation API Documentation

## Base URL
```
http://localhost:3000/api/wa
```

## Endpoints

### 1. Send Message
**POST** `/wa/send-message`

Mengirim pesan WhatsApp ke nomor tertentu.

**Request Body:**
```json
{
  "phone": "6282255355740",
  "message": "Hello from Katsikat!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": "message_id",
    "timestamp": 1234567890,
    "to": "6282255355740"
  }
}
```

### 2. Get Status
**GET** `/wa/status`

Mengecek status koneksi WhatsApp.

**Response:**
```json
{
  "success": true,
  "isReady": true,
  "message": "WhatsApp connected"
}
```

### 3. Get QR Code
**GET** `/wa/qr`

Mendapatkan QR code untuk autentikasi WhatsApp Web.

**Response:**
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "isReady": false
}
```

### 4. Test Connection
**GET** `/wa/test`

Test koneksi lengkap dengan status dan QR code.

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp automation test completed",
  "timestamp": "2025-09-01T05:43:02.209Z",
  "status": {
    "success": true,
    "isReady": true,
    "message": "WhatsApp connected"
  },
  "qrAvailable": false
}
```

## Session Management Endpoints

### 5. Destroy Session
**POST** `/wa/destroy-session`

Menghapus session WhatsApp saat ini dan reinitialize. Berguna jika ada masalah koneksi.

**Response:**
```json
{
  "success": true,
  "message": "Session destroyed and reinitialized successfully",
  "timestamp": "2025-09-01T05:43:02.209Z"
}
```

### 6. Logout
**POST** `/wa/logout`

Logout dari WhatsApp Web dan reset session. Berguna untuk ganti akun atau reset koneksi.

**Response:**
```json
{
  "success": true,
  "message": "Logout completed and session reinitialized successfully",
  "warning": null,
  "timestamp": "2025-09-01T05:43:02.209Z"
}
```

### 7. Restart Service
**POST** `/wa/restart`

Restart service WhatsApp automation sepenuhnya. Berguna jika ada masalah serius.

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp service restarted successfully",
  "timestamp": "2025-09-01T05:43:02.209Z"
}
```

## Error Responses

Semua endpoint dapat mengembalikan error response dengan format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "timestamp": "2025-09-01T05:43:02.209Z"
}
```

## Usage Examples

### Frontend Integration

#### Send Message
```javascript
const sendWhatsAppMessage = async (phone, message) => {
  try {
    const response = await fetch('/api/wa/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, message })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};
```

#### Session Management
```javascript
const resetWhatsAppSession = async () => {
  try {
    const response = await fetch('/api/wa/destroy-session', {
      method: 'POST'
    });
    
    const result = await response.json();
    if (result.success) {
      // Session berhasil direset, QR code baru tersedia
      console.log('Session reset successfully');
    }
    return result;
  } catch (error) {
    console.error('Error resetting session:', error);
    throw error;
  }
};

const logoutWhatsApp = async () => {
  try {
    const response = await fetch('/api/wa/logout', {
      method: 'POST'
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
};
```

## Troubleshooting

### Common Issues

1. **Session Expired**: Gunakan `/wa/destroy-session` untuk reset
2. **Connection Lost**: Gunakan `/wa/restart` untuk restart service
3. **Authentication Failed**: Gunakan `/wa/logout` untuk logout dan scan QR baru

### Recovery Flow

Jika ada masalah dengan WhatsApp automation:

1. **Cek status** dengan `/wa/status`
2. **Reset session** dengan `/wa/destroy-session`
3. **Jika masih bermasalah**, gunakan `/wa/logout`
4. **Terakhir**, gunakan `/wa/restart` untuk restart service

## Notes

- Semua endpoint menggunakan async/await
- Error handling sudah diimplementasikan di semua endpoint
- Timestamp menggunakan format ISO 8601
- Response selalu konsisten dengan format yang sama
