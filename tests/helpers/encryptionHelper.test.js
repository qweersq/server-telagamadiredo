const { EncryptionHelper } = require('../../src/helpers');
const CryptoJS = require('crypto-js');

jest.mock('crypto-js', () => ({
  AES: {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  },
  enc: {
    Hex: {
      parse: jest.fn(),
    },
    Utf8: {
      parse: jest.fn(),
    },
  },
  mode: {
    ECB: 'ECB',
  },
}));

describe('EncryptionHelper', () => {
  describe('encryptID', () => {
    it('harus mengenkripsi ID dengan benar', () => {
      const id = 12345;
      const encryptedValue = 'encrypted_value';

      CryptoJS.AES.encrypt.mockReturnValue({ toString: () => encryptedValue });

      const result = EncryptionHelper.encryptID(id);

      expect(CryptoJS.AES.encrypt).toHaveBeenCalledWith(
        id.toString(),
        CryptoJS.enc.Hex.parse(EncryptionHelper.ENCRYPT_KEY),
        { mode: CryptoJS.mode.ECB }
      );
      expect(result).toBe(encryptedValue);
    });
  });

  describe('decryptID', () => {
    it('harus mendekripsi ID dengan benar', () => {
      const encrypted = 'encrypted_value';
      const decryptedValue = '12345';

      CryptoJS.AES.decrypt.mockReturnValue({ toString: () => decryptedValue });

      const result = EncryptionHelper.decryptID(encrypted);

      expect(CryptoJS.AES.decrypt).toHaveBeenCalledWith(
        encrypted,
        CryptoJS.enc.Hex.parse(EncryptionHelper.ENCRYPT_KEY),
        { mode: CryptoJS.mode.ECB }
      );
      expect(result).toBe(decryptedValue);
    });
  });

  describe('error handling', () => {
    it('harus melemparkan error saat enkripsi gagal', () => {
      const id = 12345;

      CryptoJS.AES.encrypt.mockImplementation(() => {
        throw new Error('Enkripsi gagal');
      });

      expect(() => {
        EncryptionHelper.encryptID(id);
      }).toThrow('Enkripsi gagal');
    });

    it('harus melemparkan error saat dekripsi gagal', () => {
      const encrypted = 'encrypted_value';

      CryptoJS.AES.decrypt.mockImplementation(() => {
        throw new Error('Dekripsi gagal');
      });

      expect(() => {
        EncryptionHelper.decryptID(encrypted);
      }).toThrow('Dekripsi gagal');
    });
  });
});