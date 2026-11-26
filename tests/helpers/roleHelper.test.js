const { RoleHelper } = require('../../src/helpers');

describe('RoleHelper', () => {
  describe('getRoles', () => {
    it('harus mengembalikan array yang berisi daftar peran', () => {
      const roles = RoleHelper.getRoles();

      expect(Array.isArray(roles)).toBe(true);
      expect(roles).toHaveLength(3);

      expect(roles[0]).toMatchObject({ id: 1, name: 'superadmin' });
      expect(roles[1]).toMatchObject({ id: 2, name: 'admin' });
      expect(roles[2]).toMatchObject({ id: 3, name: 'employee' });
    });
  });

  describe('getRoleByName', () => {
    it('harus mengembalikan objek peran yang sesuai untuk nama yang valid', () => {
      const role = RoleHelper.getRoleByName('admin');

      expect(role).toMatchObject({ id: 2, name: 'admin' });
    });

    it('harus tidak peka terhadap huruf besar/kecil saat mencocokkan nama', () => {
      const role = RoleHelper.getRoleByName('SuPeRaDmIn');

      expect(role).toMatchObject({ id: 1, name: 'superadmin' });
    });

    it('harus mengembalikan undefined jika tidak ada peran yang cocok dengan nama tersebut', () => {
      const role = RoleHelper.getRoleByName('unknow');

      expect(role).toBeUndefined();
    });

    it('harus melemparkan error jika getRoles melemparkan error', () => {
      jest.spyOn(RoleHelper, 'getRoles').mockImplementation(() => {
        throw new Error('Failed get roles');
      });

      expect(() => RoleHelper.getRoleByName('admin')).toThrow('Failed get roles');

      RoleHelper.getRoles.mockRestore();
    });
  });
});