// Wrapper function using Promises
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err)); // Agar koi error aaye toh Express ke global error handler ko bhej do
  };
};

export { asyncHandler };
