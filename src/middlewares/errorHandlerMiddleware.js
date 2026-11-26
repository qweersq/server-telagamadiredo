const ResponseHelper = require('../helpers/responseHelper');

class ErrorHandlerMiddleware {
    static handleError(error, req, res, next) {
        console.error('🚨 Global Error Handler:', {
            message: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method,
            body: req.body,
            params: req.params,
            query: req.query,
            timestamp: new Date().toISOString()
        });

        // Handle specific error types
        if (error.name === 'ValidationError') {
            return res.status(400).send(ResponseHelper.errorResponse(
                'Validation Error: ' + error.message
            ));
        }

        if (error.name === 'SequelizeValidationError') {
            const validationErrors = error.errors.map(err => ({
                field: err.path,
                message: err.message,
                value: err.value
            }));
            
            console.error('🔍 Sequelize Validation Errors:', validationErrors);
            
            return res.status(400).send(ResponseHelper.errorResponse(
                'Database Validation Error: ' + error.message,
                { validation_errors: validationErrors }
            ));
        }

        if (error.name === 'SequelizeUniqueConstraintError') {
            const uniqueErrors = error.errors.map(err => ({
                field: err.path,
                message: err.message,
                value: err.value
            }));
            
            console.error('🔍 Sequelize Unique Constraint Errors:', uniqueErrors);
            
            return res.status(400).send(ResponseHelper.errorResponse(
                'Duplicate Entry Error: ' + error.message,
                { unique_errors: uniqueErrors }
            ));
        }

        if (error.name === 'SequelizeForeignKeyConstraintError') {
            console.error('🔍 Foreign Key Constraint Error:', {
                table: error.table,
                constraint: error.constraint,
                fields: error.fields
            });
            
            return res.status(400).send(ResponseHelper.errorResponse(
                'Foreign Key Constraint Error: ' + error.message
            ));
        }

        if (error.name === 'SequelizeDatabaseError') {
            console.error('🔍 Database Error:', {
                message: error.message,
                sql: error.sql,
                parameters: error.parameters
            });
            
            return res.status(500).send(ResponseHelper.errorResponse(
                'Database Error: ' + error.message
            ));
        }

        // Handle custom application errors
        if (error.message && error.message.includes('Gagal membuat')) {
            return res.status(500).send(ResponseHelper.errorResponse(error.message));
        }

        // Default error response
        return res.status(500).send(ResponseHelper.errorResponse(
            'Internal Server Error: ' + error.message
        ));
    }

    static handleNotFound(req, res) {
        console.error('🚨 404 Not Found:', {
            url: req.url,
            method: req.method,
            timestamp: new Date().toISOString()
        });

        return res.status(404).send(ResponseHelper.errorResponse(
            `Route not found: ${req.method} ${req.url}`
        ));
    }

    static handleAsyncError(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }
}

module.exports = ErrorHandlerMiddleware;
