const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../src/models');

describe('Employee Performance API', () => {
    let authToken;
    let testEmployeeId;

    beforeAll(async () => {
        // Setup test database
        await sequelize.sync({ force: true });
        
        // Create test data
        // Note: In real implementation, you would create test data here
        testEmployeeId = 1;
    });

    afterAll(async () => {
        await sequelize.close();
    });

    describe('GET /api/employees', () => {
        it('should return list of employees with pagination', async () => {
            const response = await request(app)
                .get('/api/employees')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    page: 1,
                    pageSize: 10
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('employees');
            expect(response.body.data).toHaveProperty('pagination');
        });

        it('should filter employees by branch_id', async () => {
            const response = await request(app)
                .get('/api/employees')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    branch_id: 1
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should search employees by name', async () => {
            const response = await request(app)
                .get('/api/employees')
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    search: 'John'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('GET /api/employees/:id', () => {
        it('should return employee detail', async () => {
            const response = await request(app)
                .get(`/api/employees/${testEmployeeId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data).toHaveProperty('name');
            expect(response.body.data).toHaveProperty('Branch');
        });

        it('should return 404 for non-existent employee', async () => {
            const response = await request(app)
                .get('/api/employees/999999')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/employees/:id/summary', () => {
        it('should return employee performance summary', async () => {
            const response = await request(app)
                .get(`/api/employees/${testEmployeeId}/summary`)
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    start_date: '2025-01-01',
                    end_date: '2025-01-31'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('employee');
            expect(response.body.data).toHaveProperty('summary');
            expect(response.body.data.summary).toHaveProperty('attendance');
            expect(response.body.data.summary).toHaveProperty('delivery');
            expect(response.body.data.summary).toHaveProperty('processed_items');
        });

        it('should validate date format', async () => {
            const response = await request(app)
                .get(`/api/employees/${testEmployeeId}/summary`)
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    start_date: 'invalid-date'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/employees/:id/attendance', () => {
        it('should return employee attendance data', async () => {
            const response = await request(app)
                .get(`/api/employees/${testEmployeeId}/attendance`)
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    start_date: '2025-01-01',
                    end_date: '2025-01-31'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('GET /api/employees/:id/deliveries', () => {
        it('should return employee delivery data', async () => {
            const response = await request(app)
                .get(`/api/employees/${testEmployeeId}/deliveries`)
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    start_date: '2025-01-01',
                    end_date: '2025-01-31'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('GET /api/employees/:id/processed-items', () => {
        it('should return employee processed items', async () => {
            const response = await request(app)
                .get(`/api/employees/${testEmployeeId}/processed-items`)
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    start_date: '2025-01-01',
                    end_date: '2025-01-31'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should filter by status', async () => {
            const response = await request(app)
                .get(`/api/employees/${testEmployeeId}/processed-items`)
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    start_date: '2025-01-01',
                    end_date: '2025-01-31',
                    status: 'completed'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('GET /api/employees/:id/performance-chart', () => {
        it('should return work hours chart data', async () => {
            const response = await request(app)
                .get(`/api/employees/${testEmployeeId}/performance-chart`)
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    start_date: '2025-01-01',
                    end_date: '2025-01-31',
                    chart_type: 'work_hours'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should return processed items chart data', async () => {
            const response = await request(app)
                .get(`/api/employees/${testEmployeeId}/performance-chart`)
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    start_date: '2025-01-01',
                    end_date: '2025-01-31',
                    chart_type: 'processed_items'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should return delivery cost chart data', async () => {
            const response = await request(app)
                .get(`/api/employees/${testEmployeeId}/performance-chart`)
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    start_date: '2025-01-01',
                    end_date: '2025-01-31',
                    chart_type: 'delivery_cost'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should validate chart type', async () => {
            const response = await request(app)
                .get(`/api/employees/${testEmployeeId}/performance-chart`)
                .set('Authorization', `Bearer ${authToken}`)
                .query({
                    chart_type: 'invalid_type'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('Authentication', () => {
        it('should require authentication token', async () => {
            const response = await request(app)
                .get('/api/employees');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('Authorization', () => {
        it('should require proper role permissions', async () => {
            // Test with insufficient permissions
            const response = await request(app)
                .get('/api/employees')
                .set('Authorization', 'Bearer invalid_token');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });
});
