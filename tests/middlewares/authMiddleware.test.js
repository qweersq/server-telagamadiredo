const jwt = require('jsonwebtoken');

const { AuthMiddleware } = require('../../src/middlewares');
const UserService = require('../../src/services/userService');
const { EncryptionHelper, ResponseHelper, RoleHelper } = require('../../src/helpers');

jest.mock('jsonwebtoken');
jest.mock('../../src/services/userService');
jest.mock('../../src/helpers/encryptionHelper');
jest.mock('../../src/helpers/responseHelper');
jest.mock('../../src/helpers/roleHelper');

describe('AuthMiddleware', () => {
  describe('authenticateUser', () => {
    it('harus mengembalikan 401 jika header Authorization hilang', async () => {
      const req = { header: jest.fn().mockReturnValue(null) };
      const res = { status: jest.fn().mockReturnValue({ send: jest.fn() }) };
      const next = jest.fn();

      await AuthMiddleware.authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.status().send).toHaveBeenCalledWith(
        ResponseHelper.errorResponse('Header Authorization hilang atau tidak valid', 401)
      );
    });

    it('harus mengembalikan 401 jika token tidak valid atau kedaluwarsa', async () => {
      const req = { header: jest.fn().mockReturnValue('Bearer invalidToken') };
      const res = { status: jest.fn().mockReturnValue({ send: jest.fn() }) };
      const next = jest.fn();

      jwt.verify.mockImplementation(() => {
        throw new Error('Token tidak valid');
      });

      await AuthMiddleware.authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.status().send).toHaveBeenCalledWith(
        ResponseHelper.errorResponse('Token tidak valid atau autentikasi gagal', 401)
      );
    });

    it('harus memanggil next() jika token valid dan pengguna ditemukan', async () => {
      const req = { header: jest.fn().mockReturnValue('Bearer validToken') };
      const res = {};
      const next = jest.fn();

      const mockUser = { id: '1', role: 'user' };
      jwt.verify.mockReturnValue({ id: '1' });
      EncryptionHelper.decryptID.mockReturnValue('1');
      UserService.getById.mockResolvedValue(mockUser);

      await AuthMiddleware.authenticateUser(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(req.token).toBe('validToken');
      expect(next).toHaveBeenCalled();
    });

    it('harus mengembalikan 401 jika pengguna tidak ditemukan', async () => {
      const req = { header: jest.fn().mockReturnValue('Bearer validToken') };
      const res = { status: jest.fn().mockReturnValue({ send: jest.fn() }) };
      const next = jest.fn();

      jwt.verify.mockReturnValue({ id: '1' });
      EncryptionHelper.decryptID.mockReturnValue('1');
      UserService.getById.mockResolvedValue(null);

      await AuthMiddleware.authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.status().send).toHaveBeenCalledWith(
        ResponseHelper.errorResponse('User not found', 401)
      );
    });
  });

  describe('allow', () => {
    it('harus mengembalikan 403 jika peran pengguna tidak diizinkan', async () => {
      const req = { user: { role: 'user' } };
      const res = { status: jest.fn().mockReturnValue({ send: jest.fn() }) };
      const next = jest.fn();
      const allowedRoleIds = [1, 2];

      RoleHelper.getRoleByName.mockReturnValue({ id: 3 });

      await AuthMiddleware.allow(allowedRoleIds)(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.status().send).toHaveBeenCalledWith(
        ResponseHelper.errorResponse('Forbidden', 403)
      );
    });

    it('harus memanggil next() jika peran pengguna diizinkan', async () => {
      const req = { user: { role: 'admin' } };
      const res = {};
      const next = jest.fn();
      const allowedRoleIds = [1, 2, 3];

      RoleHelper.getRoleByName.mockReturnValue({ id: 2 });

      await AuthMiddleware.allow(allowedRoleIds)(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('harus mengembalikan 403 jika peran tidak ditemukan', async () => {
      const req = { user: { role: 'unknown' } };
      const res = { status: jest.fn().mockReturnValue({ send: jest.fn() }) };
      const next = jest.fn();
      const allowedRoleIds = [1, 2];

      RoleHelper.getRoleByName.mockReturnValue(null);

      await AuthMiddleware.allow(allowedRoleIds)(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.status().send).toHaveBeenCalledWith(
        ResponseHelper.errorResponse('Forbidden', 403)
      );
    });
  });
});