const { ResponseHelper } = require('../../src/helpers');

describe('ResponseHelper', () => {
  describe('successResponse', () => {
    it('harus mengembalikan respons sukses dengan data dan pesan default', () => {
      const response = ResponseHelper.successResponse();

      expect(response.success).toBe(true);
      expect(response.statusCode).toBe(200);
      expect(response.message).toBe('Operation successful');
      expect(response.data).toBeNull();
    });

    it('harus mengembalikan respons sukses dengan data yang diberikan', () => {
      const data = { id: 1, name: 'John Doe' };
      const response = ResponseHelper.successResponse(data);

      expect(response.success).toBe(true);
      expect(response.statusCode).toBe(200);
      expect(response.message).toBe('Operation successful');
      expect(response.data).toEqual(data);
    });

    it('harus mengembalikan respons sukses dengan pesan yang diberikan', () => {
      const data = { id: 1, name: 'John Doe' };
      const message = 'Data retrieved successfully';
      const response = ResponseHelper.successResponse(data, message);

      expect(response.success).toBe(true);
      expect(response.statusCode).toBe(200);
      expect(response.message).toBe(message);
      expect(response.data).toEqual(data);
    });
  });

  describe('errorResponse', () => {
    it('harus mengembalikan respons error dengan pesan dan statusCode default', () => {
      const response = ResponseHelper.errorResponse();

      expect(response.success).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.error.message).toBe('Internal server error');
    });

    it('harus mengembalikan respons error dengan pesan yang diberikan', () => {
      const message = 'Something went wrong';
      const response = ResponseHelper.errorResponse(message);

      expect(response.success).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.error.message).toBe(message);
    });

    it('harus mengembalikan respons error dengan statusCode yang diberikan', () => {
      const message = 'Not found';
      const statusCode = 404;
      const response = ResponseHelper.errorResponse(message, statusCode);

      expect(response.success).toBe(false);
      expect(response.statusCode).toBe(statusCode);
      expect(response.error.message).toBe(message);
    });
  });
});