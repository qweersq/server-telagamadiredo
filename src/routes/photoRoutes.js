const path = require('path');
const fs = require('fs');
const ResponseHelper = require('../helpers/responseHelper');
const { AuthMiddleware, PhotoUploaderMiddleware } = require('../middlewares');
const express = require('express');
const router = express.Router();

router.use(AuthMiddleware.authenticateUser);

const handleUpload = ({
    baseFolder = './public/images', folder, route, reqPhotoBody = 'photos', reqBodyField = 'customer', allowRoles = []
}) => {
    const pathFolder = path.join(baseFolder, folder);
    const upload = PhotoUploaderMiddleware.configureUpload({ pathFolder });

    router.post(route, AuthMiddleware.allow(allowRoles), upload.array(reqPhotoBody, 50), async (req, res, next) => {
        try {
            const { [reqBodyField]: userField, phone } = req.body;

            const renamedFiles = req.files.map((file, idx) => {
                const timestamp = Date.now();
                const sanitizedField = userField ? userField.replace(/\s/g, '_') : 'anonymous';
                // Tambahkan idx dan originalname agar unik
                const newFileName = `${timestamp}-${idx}-${sanitizedField}-${phone || ''}-${file.originalname}`;
                const newPath = path.join(path.dirname(file.path), newFileName);

                if (fs.existsSync(file.path)) {
                  fs.renameSync(file.path, newPath);
                  return { url_photo: newPath };
                } else {
                  console.error('File not found:', file.path);
                  return { error: 'File not found', file: file.path };
                }
            });

            return res.status(201).json(ResponseHelper.successResponse(renamedFiles));
        } catch (error) {
            next(error);
        }
    });

    router.use((err, req, res, next) => {
        if (err.status === 400 && err.message === 'Forbidden file type') {
            return res.status(400).json(ResponseHelper.errorResponse('File type is not allowed.'));
        } else {
            return res.status(500).json(ResponseHelper.errorResponse(err.message));
        }
    });
};

handleUpload({ folder: 'item', route: '/uploads', allowRoles: [1, 2, 3, 4] });
handleUpload({ folder: 'absents', route: '/uploads-absents', allowRoles: [1, 2, 3, 4] });
handleUpload({ folder: 'evidence', route: '/uploads-evidence', allowRoles: [1, 2, 3, 4] });
handleUpload({ folder: 'expenses', route: '/uploads-expenses', reqBodyField: 'user', allowRoles: [1, 2, 3, 4] });
handleUpload({ folder: 'itemprocess', route: '/uploads-process', reqBodyField: 'photos', allowRoles: [1, 2, 3, 4] });
handleUpload({ folder: 'deliveries', route: '/uploads-odo', reqBodyField: 'photos', allowRoles: [1, 2, 3, 4] });
handleUpload({ folder: 'logo', route: '/uploads-logo', reqBodyField: 'tenant', reqPhotoBody: 'logo', allowRoles: [1, 2] });

module.exports = router;