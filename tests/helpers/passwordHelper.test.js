const { PasswordHelper } = require('../../src/helpers');
const bcrypt = require('bcrypt');

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('PasswordHelper', () => {
  describe('comparePasswords', () => {
    it('harus mengembalikan true jika password cocok', async () => {
      const plainPassword = 'plainPassword';
      const hashedPassword = 'hashedPassword';

      bcrypt.compare.mockResolvedValue(true);

      const result = await PasswordHelper.comparePasswords(plainPassword, hashedPassword);

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
    });

    it('harus mengembalikan false jika password tidak cocok', async () => {
      const plainPassword = 'plainPassword';
      const hashedPassword = 'hashedPassword';

      bcrypt.compare.mockResolvedValue(false);

      const result = await PasswordHelper.comparePasswords(plainPassword, hashedPassword);

      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
    });

    it('harus melemparkan error jika bcrypt.compare gagal', async () => {
      const plainPassword = 'plainPassword';
      const hashedPassword = 'hashedPassword';

      bcrypt.compare.mockRejectedValue(new Error('bcrypt error'));

      await expect(PasswordHelper.comparePasswords(plainPassword, hashedPassword))
        .rejects
        .toThrow('bcrypt error');
    });
  });
});