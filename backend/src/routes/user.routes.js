import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  forgotPasswordSendOTP,
  resetPasswordWithOTP,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import rateLimit from "express-rate-limit";

const router = Router();

// Ek IP 5 minutes mein sirf 5 dafa hi reset attempt ho sakegi
const resetPasswordLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  message:
    "Too many reset attempts from this IP, please try again after 5 minutes.",
});


// AUTH ROUTES 


router.post(
  "/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser,
);
router.post("/login", loginUser);
router.post("/logout", verifyJWT, logoutUser);
router.get("/get-current-user", verifyJWT, getCurrentUser);
router.post("/refresh-token", refreshAccessToken);
router.post("/change-password", verifyJWT, changeCurrentPassword);
router.post("/forgot-password", forgotPasswordSendOTP);
router.post("/reset-password", resetPasswordLimiter, resetPasswordWithOTP);


export default router;
