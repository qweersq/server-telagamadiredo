const express = require('express');
const router = express.Router();

const { AbsentController } = require('../controllers');
const { AuthMiddleware } = require('../middlewares');
const tenantValidation = require('../middleware/tenantValidation');
const absentAccessControl = require('../middleware/absentAccessControl');
const { Absent } = require('../models');

router.use(AuthMiddleware.authenticateUser);

router.post('/absents', AuthMiddleware.allow([1,2,3,4]), AbsentController.create);
router.get('/absents', AuthMiddleware.allow([1,2,3,4]), AbsentController.getAll);

// Monitoring absensi (supervisor/owner): satu tanggal + filter cabang,
// urut skor AI terendah → tertinggi.
router.get('/attendance-monitor', AuthMiddleware.allow([1,2,4]), AbsentController.getMonitor);
router.get('/absents/:id', 
  AuthMiddleware.allow([1,2,3,4]), 
  tenantValidation, 
  absentAccessControl, 
  AbsentController.getById
);
router.get('/absents-user/:id', AuthMiddleware.allow([1,2,3,4]), AbsentController.getByUserId);
router.put('/absents/:id', 
  AuthMiddleware.allow([1,2,3,4]), 
  tenantValidation, 
  absentAccessControl, 
  AbsentController.update
);
router.delete('/absents/:id', 
  AuthMiddleware.allow([1,4]), 
  tenantValidation, 
  absentAccessControl, 
  AbsentController.delete
);
router.get('/check-today', AuthMiddleware.allow([1,2,3,4]), AbsentController.checkTodayAbsent);

router.post('/permissions', AuthMiddleware.allow([1,2,3,4]), AbsentController.createPermission);
router.get('/my-permissions', AuthMiddleware.allow([1,2,3,4]), AbsentController.getMyPermissions);

router.post('/end-work', AuthMiddleware.allow([1,2,3,4]), AbsentController.endWork);

// Verifikasi foto absen (AI). `verify` untuk nilai ulang, `override` untuk timpa manual.
router.post('/absents/:id/verify',
  AuthMiddleware.allow([1,2,3,4]),
  tenantValidation,
  absentAccessControl,
  AbsentController.verify
);
router.patch('/absents/:id/verify',
  AuthMiddleware.allow([1,2,4]),
  tenantValidation,
  absentAccessControl,
  AbsentController.override
);

module.exports = router;