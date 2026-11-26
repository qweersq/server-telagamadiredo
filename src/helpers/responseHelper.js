class ResponseHelper {
  static successResponse(data = null, message = 'Operation successful') {
    return {
      success: true,
      statusCode: 200,
      message: message,
      data: data,
    };
  }

  static errorResponse(message = 'Internal server error', statusCode = 500, data = null) {
    const response = {
      success: false,
      statusCode: statusCode,
      error: {
        message: message,
      },
    };
    
    // Add data to response if provided
    if (data) {
      response.data = data;
    }
    
    return response;
  }
}

module.exports = ResponseHelper;