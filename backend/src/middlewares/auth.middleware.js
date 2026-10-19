import jwt from "jsonwebtoken";
import { User } from "./../models/user.models.js";
import { ApiError } from "../utils/ApiError.js"; // Apna ApiError path verify kar lena
import { asyncHandler } from "../utils/asyncHandler.js"; // Apna asyncHandler path verify kar lena

export const verifyJWT = asyncHandler(async (req, res, next) => {
  // 1. Token nikalna (Cookie ya Authorization Header se)
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized request! Token missing.");
  }

  // 2. Token ko verify karna secret key ke saath
  // verify function error throw kar sakta hai agar token expired ya invalid ho, isko safe handle karne ke liye inner try-catch lagaya hai
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(
      401,
      error?.message || "Invalid or Expired Access Token",
    );
  }

  // 3. Token ke andar se jo ID mili, us se user ko database me dhoondna
  const user = await User.findById(decodedToken?._id).select(
    "-password -refreshToken",
  );

  if (!user) {
    throw new ApiError(401, "Invalid Access Token! User not found.");
  }

  // 4. User object ko `req` me inject karna
  req.user = user;

  // 5. Agle function/controller par pass karna
  next();
});
