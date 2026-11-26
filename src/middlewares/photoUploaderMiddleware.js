const multer = require('multer');
const path = require('path');
const fs = require('fs');

class PhotoUploaderMiddleware {
  static configureUpload({ pathFolder }) {
    try {
      const storage = multer.diskStorage({
        destination: (req, file, cb) => {
          const currentDate = new Date();
          const monthYearFolder = `${currentDate.toLocaleString('en-US', { month: 'long' })}-${currentDate.getFullYear()}`;
          const destinationPath = path.join(pathFolder, monthYearFolder);

          if (!fs.existsSync(destinationPath)) fs.mkdirSync(destinationPath, { recursive: true });
          cb(null, destinationPath);
        },
        filename: (req, file, cb) => {
          const timestamp = Date.now();
          const random = Math.round(Math.random() * 1E9);
          const fileName = `${path.basename(file.originalname, path.extname(file.originalname))}-${timestamp}-${random}${path.extname(file.originalname)}`;
          cb(null, fileName);
        },
      });

      const fileFilter = (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png'];
        const fileExtension = path.extname(file.originalname).toLowerCase();

        if (allowedMimeTypes.includes(file.mimetype) && (fileExtension === '.jpg' || fileExtension === '.jpeg' || fileExtension === '.png')) {
          cb(null, true);
        } else {
          const error = new Error('Forbidden file type. Only JPG and PNG images are allowed.');
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
      throw new Error('Error configuring file upload: ' + error.message);
    }
  }
}

module.exports = PhotoUploaderMiddleware;