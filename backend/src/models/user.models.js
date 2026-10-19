import mongoose from "mongoose";
import { Schema } from "mongoose";
import { Video } from "./video.models.js";
import bcrypt from "bcrypt"; // Password hashing ke liy
import jwt from "jsonwebtoken"; // JWT token generate karne ke liye

const userSchema = new Schema(
  {
    watchHistory: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Video",
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true, // automatic small letters kar dega (e.g. Ali_12 -> ali_12)
      trim: true, // aage piche ki faltu spaces khatam kar dega
      index: true, // database me search operation ko bohot fast banata hai
      // Yeh Regex ensure karega ke username me spaces na hon aur sirf letters, numbers ya underscore ho
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username cannot contain spaces or special characters except underscore (_)",
      ],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true, // Automatic small letters me convert kar dega (e.g., Ali@Gmail.Com -> ali@gmail.com)
      trim: true, // Shuru aur aakhri ki faltu spaces khatam kar dega
      // Yeh Regex check karega ke email ka format bilkul sahi ho (jaise: text@domain.com)
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please fill a valid email address", // Galat format par yeh error message aayega
      ],
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true, // Shuru aur aakhri ki faltu spaces automatic khatam kar dega (e.g. "  Ali Khan  " -> "Ali Khan")
      // Yeh Regex ensure karega ke naam me sirf English letters (bade ya chhote) aur beech me space ho
      match: [/^[a-zA-Z\s]+$/, "Full name can only contain letters and spaces"],
    },
    avatar: {
      type: String, // Cloudinary ya kisi aur cloud platform ka secure URL yahan save hoga
      required: [true, "Avatar image URL is required"],
      trim: true,
    },
    coverImage: {
      type: String, // Cloudinary ka secure URL yahan save hoga
      trim: true, // Agar link me koi space ho toh remove ho jaye
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    forgotPasswordOTP: {
      type: Number, // 6 digit ka number save karne ke liye
      default: undefined,
    },
    forgotPasswordOTPExpiry: {
      type: Date, // OTP kab expire hoga
      default: undefined,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true },
);

// 🔒 1. Pre-Save Hook: Password ko save hone se pehle hash karna
userSchema.pre("save", async function () {
  // Agar password modify (change) nahi hua, toh agle step par chale jao
  if (!this.isModified("password")) return;

  // Agar password naya hai ya change hua hai, toh usko 10 salt rounds ke sath hash kar do
  this.password = await bcrypt.hash(this.password, 10);
  return;
});

// 🔑 2. Custom Method: Login ke waqt password match karne ke liye
userSchema.methods.isPasswordCorrect = async function (password) {
  // Yeh entered password ko database wale hashed password se compare karega
  return await bcrypt.compare(password, this.password); // true ya false return karega
};

//  3. Method: Access Token Generate Karna
userSchema.methods.generateAccessToken = function () {
  // jwt.sign(payload, secret_key, options)
  return jwt.sign(
    {
      // Payload: Jo data hum token ke andar encrypt karke rakhna chahte hain
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET, // `.env` file se secret key
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY, // Token ki life (e.g., 1d ya 15m)
    },
  );
};

// 4. Method: Refresh Token Generate Karna
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      // Refresh token mein zyada data nahi rakhte, sirf ID kaafi hoti hai
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET, // `.env` file se alag refresh secret key
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY, // Iska time lamba hota hai (e.g., 10d)
    },
  );
};

// 5. Method: Forgot Password OTP Generate Karna
userSchema.methods.generateForgotPasswordOTP = function () {
  // 100000 se 999999 ke beech aik random 6 digit number generate karein
  const otp = Math.floor(100000 + Math.random() * 900000);

  // Database mein directly save karne ke liye assign karein
  this.forgotPasswordOTP = otp;

  // OTP ki expiry kam rakhein (e.g., 5 minutes) kyunki OTP jaldi expire hona chahiye
  this.forgotPasswordOTPExpiry = Date.now() + 1 * 60 * 1000;

  return otp; // Controller ko return karein taake email mein bheja ja sakay
};

export const User = mongoose.model("User", userSchema);
