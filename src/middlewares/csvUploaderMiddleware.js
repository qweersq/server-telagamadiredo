const multer = require('multer');
const path = require('path');
const fs = require('fs');

class CsvUploaderMiddleware {
  static configureUpload() {
    try {
      // Create temp directory if not exists
      const tempDir = path.join(__dirname, '../../temp/uploads');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const storage = multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, tempDir);
        },
        filename: (req, file, cb) => {
          const timestamp = Date.now();
          const random = Math.round(Math.random() * 1E9);
          const fileName = `customer-import-${timestamp}-${random}${path.extname(file.originalname)}`;
          cb(null, fileName);
        },
      });

      const fileFilter = (req, file, cb) => {
        const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel'];
        const fileExtension = path.extname(file.originalname).toLowerCase();

        // Check mime type and extension
        if ((allowedMimeTypes.includes(file.mimetype) || file.mimetype === 'application/octet-stream') && 
            fileExtension === '.csv') {
          cb(null, true);
        } else {
          const error = new Error('File harus berformat CSV (.csv)');
          error.status = 400;
          return cb(error);
        }
      };

      return multer({ 
        storage, 
        fileFilter,
        limits: {
          fileSize: 10 * 1024 * 1024 // 10MB limit
        }
      });
    } catch (error) {
      throw new Error('Error configuring CSV upload: ' + error.message);
    }
  }
}

module.exports = CsvUploaderMiddleware;
