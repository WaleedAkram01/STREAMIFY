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
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import rateLimit from "express-rate-limit";

const router = Router();

// Ek IP 2 minutes mein sirf 5 dafa hi reset attempt ho sakegi
const resetPasswordLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 5,
  message:
    "Too many reset attempts from this IP, please try again after 2 minutes.",
});

// AUTH ROUTES
//1- Register
router.post(
  "/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser,
);
// 2-Login
router.post("/login", loginUser);
// 3-Logout
router.post("/logout", verifyJWT, logoutUser);
// 4- Get Current User
router.get("/get-current-user", verifyJWT, getCurrentUser);
// 5- Refresh Access Token
router.post("/refresh-token", refreshAccessToken);
//  6- Change Current Password
router.post("/change-password", verifyJWT, changeCurrentPassword);
// 7- Forgot Password
router.post("/forgot-password", forgotPasswordSendOTP);
// 8- Reset Password with OTP
router.post("/reset-password", resetPasswordLimiter, resetPasswordWithOTP);
// 9- Update Account Details
router.post("/update-profile", verifyJWT, updateAccountDetails);
// 10- Route for changing avatar
router.patch(
  "/update-avatar",
  verifyJWT,
  upload.single("avatar"), // Postman field key name must match "avatar"
  updateUserAvatar,
);

// 11-Route for changing cover image
router.patch(
  "/update-cover",
  verifyJWT,
  upload.single("coverImage"),
  updateUserCoverImage,
);
// 12- Route for getting user channel profile by username
router.get("/channel/:username", verifyJWT, getUserChannelProfile);
// 13- Route for getting user watch history
router.route("/watch-history").get(verifyJWT, getWatchHistory);

export default router;
