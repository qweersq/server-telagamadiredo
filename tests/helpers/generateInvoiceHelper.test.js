const { GenerateInvoiceHelper } = require('../../src/helpers');
const MD5 = require('crypto-js/md5');

jest.mock('crypto-js/md5', () => jest.fn());

describe('GenerateInvoiceHelper', () => {
    describe('generateOrderCode', () => {
        it('harus menghasilkan kode pesanan yang valid berdasarkan ID pelanggan dan tanggal', () => {
            const customerId = '12345';
            const entryDate = '2025-01-14T12:10:28.000Z';

            const mockMd5Output = 'mockedhashvalue';
            MD5.mockReturnValue(mockMd5Output);

            const orderCode = GenerateInvoiceHelper.generateOrderCode(customerId, entryDate);

            const formattedDate = entryDate.slice(0, 10).replace(/-/g, '');
            const randomNumber = orderCode.substring(7, 13);

            expect(orderCode.length).toBe(17);
            expect(orderCode.startsWith(`${GenerateInvoiceHelper.FORMAT_CODE}${formattedDate}`)).toBe(true);
            expect(randomNumber).toHaveLength(6);
        });

        it('harus menggunakan tanggal saat ini ketika entryDate tidak diberikan', () => {
            const customerId = '12345';
            const mockMd5Output = 'mockedhashvalue';
            MD5.mockReturnValue(mockMd5Output);

            const fixedDate = '2025-01-14T00:00:00.000Z';
            const RealDate = Date;
            global.Date = jest.fn(() => new RealDate(fixedDate));

            const orderCode = GenerateInvoiceHelper.generateOrderCode(customerId);

            const formattedDate = fixedDate.slice(0, 10).replace(/-/g, '');
            const randomNumber = orderCode.substring(7, 13);

            expect(orderCode.length).toBe(17);
            expect(orderCode.startsWith(`${GenerateInvoiceHelper.FORMAT_CODE}${formattedDate}`)).toBe(true);
            expect(randomNumber).toHaveLength(6);

            global.Date = RealDate;
        });

        it('harus menghasilkan kode pesanan dengan panjang 17 karakter', () => {
            const customerId = '12345';
            const entryDate = '2025-01-14T00:00:00.000Z';

            const mockMd5Output = 'mockedhashvalue';
            MD5.mockReturnValue(mockMd5Output);

            const orderCode = GenerateInvoiceHelper.generateOrderCode(customerId, entryDate);

            expect(orderCode.length).toBe(17);
        });

        it('harus melemparkan error ketika MD5 gagal', () => {
            const customerId = '12345';
            const entryDate = '2025-01-14T00:00:00.000Z';

            MD5.mockImplementation(() => {
                throw new Error('MD5 error');
            });

            expect(() => {
                GenerateInvoiceHelper.generateOrderCode(customerId, entryDate);
            }).toThrow('MD5 error');
        });
    });
});