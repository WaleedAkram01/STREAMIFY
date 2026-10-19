class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    // Agar status code 400 se kam hai (e.g., 200, 201), toh success humesha true hogi
    this.success = statusCode < 400;
  }
}

export { ApiResponse };
