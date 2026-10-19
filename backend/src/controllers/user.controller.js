import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/sendEmail.js";

// Helper function to generate access and refresh tokens and save refresh token in database
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Refresh token ko database me save karein security ke liye
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

// 1-REGISTER USER CONTROLLER
export const registerUser = asyncHandler(async (req, res) => {
  console.log("req.body:", req.body);
  console.log("req.files:", req.files);

  // 1. Frontend se data receive karna (req.body)
  const { fullName, email, username, password } = req.body;

  // 2. Validation check: Koi bhi field khali ya undefined nahi honi chahiye
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(
      400,
      "All fields (fullName, email, username, password) are required",
    );
  }

  // 3. Check karna ke user pehle se register toh nahi hai (by email ya username)
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with this email or username already exists");
  }

  // 4. Multer se aane wali images (files) ka local path nikalna
  // req.files tabhi milega jab routes me upload.fields() middleware laga hoga
  const avatarLocalPath = req.files?.avatar?.[0]?.path;

  // Cover image optional hai, isliye optional chaining ke sath check karenge
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  // 5. Validation check: Avatar file hona lazmi (required) hai
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is strictly required");
  }

  // 6. In local images ko Cloudinary par upload karna
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // Agar kisi wajah se Cloudinary par avatar upload fail ho jaye
  if (!avatar) {
    throw new ApiError(400, "Failed to upload avatar image to cloud storage");
  }

  // 7. Database mein naya User object (entry) create karna
  const user = await User.create({
    fullName,
    avatar: avatar.url, // Cloudinary ka secure web URL
    coverImage: coverImage?.url || "", // Agar upload hua toh URL, warna empty string
    email,
    password, // Yeh save hone se pehle model ka pre-save hook automatic hash kar dega
    username: username,
  });

  // 8. Security Optimization: Response bhejne se pehle password aur refresh token remove karna
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  // Check karna ke user successfully database me create hua ya nahi
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // 9. Clean and structured Success Response return karna frontend ko
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully!"));
});

// 2-LOGIN USER CONTROLLER
export const loginUser = asyncHandler(async (req, res) => {
  // 1. Frontend se data lena (Image ke mutabiq single input 'username' ya 'email' ke liye ho sakta hai)
  const { username, email, password } = req.body;

  // 2. Validation check: Check karein ke user ne ya toh email bhejha ho ya username, aur password lazmi ho
  if (!(username || email)) {
    throw new ApiError(400, "Username or Email is required");
  }

  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  // 3. Database mein user ko search karna (Chahe email match ho ya username)
  const user = await User.findOne({
    $or: [{ username: username }, { email: email }],
  });

  // Agar user database me nahi milta
  if (!user) {
    throw new ApiError(444, "User does not exist with this username or email");
  }

  // 4. Password Validation (Hamaray banaye huay custom method 'isPasswordCorrect' se check karein)
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials / Wrong password");
  }

  // 5. Access and Refresh Tokens generate karna
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );

  // 6. Response me se sensitive data ko remove karna security ke liye
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  // 7. Cookies ke liye secure options configure karna
  const options = {
    httpOnly: true, // Frontend JavaScript is token ko read ya hack nahi kar sakti (XSS protection)
    secure: true, // Sirf HTTPS par chalega production me
    sameSite: "none",
  };

  // 8. Cookies set karna aur client ko success response bhej dena
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          // RefreshToken should not be sent like this
          // refreshToken,
        },
        "User logged in successfully",
      ),
    );
});

// 3-LOGOUT USER CONTROLLER
export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    },
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

// 4-REFRESH TOKEN CONTROLLER
export const refreshAccessToken = asyncHandler(async (req, res) => {
  // 1. Cookies ya Header se incoming refresh token nikalna
  const incomingRefreshToken =
    req.cookies?.refreshToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is missing! Unauthorized request.");
  }

  // 2. Token verify karna (try-catch ki jagah error automatic global error handler me jayega agar token invalid hua)
  let decodedToken;
  try {
    decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
  } catch (error) {
    console.log("JWT Verify Error:", error.message);
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  // 3. User ko database me dhoondna
  const user = await User.findById(decodedToken?._id);

  if (!user) {
    throw new ApiError(401, "Invalid refresh token! User does not exist.");
  }

  // 4. Security Check: Token reuse tracking
  if (incomingRefreshToken !== user?.refreshToken) {
    throw new ApiError(401, "Refresh token is expired or already used!");
  }

  // 5. Cookie options setup
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  };

  // 6. Naye tokens generate karna
  // 🔥 Sahi tarike se variable rename kar ke tokens nikalna
  const { accessToken, refreshToken: newRefreshToken } =
    await generateAccessAndRefreshTokens(user._id);

  // 7. Standard ApiResponse ke saath response send karna
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          accessToken,
          // RefreshToken should not be sent.
          // refreshToken: newRefreshToken,
        },
        "Access token refreshed successfully! 🔄",
      ),
    );
});

// 5-CHANGE PASSWORD CONTROLLER
export const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  // 1. Validation check: Dono fields mandatory hain
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Both old password and new password are required");
  }

  // 2. Database se user dhoondo password field ke saath
  // (Kyunki humne verifyJWT me password select("-password") kiya tha, tou yahan explicitly password mangwana parega)
  const user = await User.findById(req.user?._id).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // 3. Check karo ke purana password sahi hai ya nahi
  // (isPasswordCorrect aapke user schema ka custom method hoga jo bcrypt.compare use karta hai)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  // 4. Naya password set karo aur save karo
  user.password = newPassword;
  await user.save({ validateBeforeSave: false }); // pre-save hook chalega aur password hash ho jayega

  // 5. Clean response return karo
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully! 🔐"));
});

// 6-GET CURRENT USER CONTROLLER
export const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

// 7-FORGOT PASSWORD CONTROLLER
export const forgotPasswordSendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required.");
  }

  const user = await User.findOne({ email });

  // Security Rule: Return generic success to prevent email fishing/enumerations
  if (!user) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          "If this email is registered, a password reset OTP has been sent.",
        ),
      );
  }

  // Generate OTP
  const otp = user.generateForgotPasswordOTP();
  await user.save({ validateBeforeSave: false });

  // Email HTML Message Template
  const message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h1 style="color: #333333; text-align: center;">Password Reset Verification Code</h1>
            <p style="font-size: 16px; color: #555555;">Your 6-digit password reset OTP is provided below:</p>
            <div style="text-align: center; margin: 30px 0;">
                <h2 style="letter-spacing: 6px; color: #4F46E5; background-color: #f3f4f6; display: inline-block; padding: 12px 24px; border-radius: 6px; font-size: 32px; margin: 0;">${otp}</h2>
            </div>
            <p style="font-size: 14px; color: #777777; text-align: center;">This OTP is valid for only 1 minutes. Do not share it with anyone.</p>
        </div>
    `;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your Password Reset OTP",
      message,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          "Verification OTP has been sent to your email address.",
        ),
      );
  } catch (error) {
    // Clear OTP fields in the database if email delivery fails
    user.forgotPasswordOTP = undefined;
    user.forgotPasswordOTPExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    throw new ApiError(500, "Failed to send email. Please try again later.");
  }
});

// 8-RESET PASSWORD WITH OTP CONTROLLER
export const resetPasswordWithOTP = asyncHandler(async (req, res) => {
  const { email, otp, password, confirmPassword } = req.body;

  if (!email || !otp || !password || !confirmPassword) {
    throw new ApiError(
      400,
      "All fields (Email, OTP, Password, and Confirm Password) are required.",
    );
  }

  if (password !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match.");
  }

  // User ko email, OTP, aur expiry ke sath search karein
  const user = await User.findOne({
    email: email?.toLowerCase().trim(),
    forgotPasswordOTP: String(otp).trim(), // Body se string ata hai, isay string format mein clean match karein
    forgotPasswordOTPExpiry: { $gt: Date.now() }, // Check karein ke expired na ho
  });

  if (!user) {
    throw new ApiError(
      400,
      "Invalid OTP or the verification code has expired.",
    );
  }

  // Naya password assign karein
  user.password = password;

  // Kaam khatam hone ke baad OTP fields ko database se saaf (clean) kar dein
  user.forgotPasswordOTP = undefined;
  user.forgotPasswordOTPExpiry = undefined;

  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password updated successfully. You can now log in.",
      ),
    );
});
