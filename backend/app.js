import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import { ApiError } from "./src/utils/ApiError.js";

// Routes import
import healthcheckRoutes from "./src/routes/healthcheck.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import videoRoutes from "./src/routes/video.routes.js";
import commentRoutes from "./src/routes/comment.routes.js";
import likeRoutes from "./src/routes/like.routes.js";
import tweetRoutes from "./src/routes/tweet.routes.js";
import subscriptionRoutes from "./src/routes/subscription.routes.js";
import playlistRoutes from "./src/routes/playlist.routes.js";
import dashboardRoutes from "./src/routes/dashboard.routes.js";

const app = express();
const isProd = process.env.NODE_ENV === "production";

// CORS: "*" aur credentials:true saath kaam nahi karte (browser reject karta hai),
// isliye CORS_ORIGIN env se comma separated list lete hain
const allowedOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// Body size limits (files multer se aati hain, JSON body chhoti honi chahiye)
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// API ROUTES
app.use("/api/v1/healthcheck", healthcheckRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/videos", videoRoutes);
app.use("/api/v1/comments", commentRoutes);
app.use("/api/v1/likes", likeRoutes);
app.use("/api/v1/tweets", tweetRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/v1/playlists", playlistRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);

// Sample Route (Testing ke liye)
app.get("/", (req, res) => {
  res.json({ message: "API is working perfectly!" });
});

// 404 handler: koi route match na ho
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

// Global error handler (hamesha sab se aakhir mein)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  if (err instanceof ApiError) {
    // Already clean error hai
  } else if (err.name === "ValidationError" && err.errors) {
    // Mongoose schema validation error -> 400 with per-field errors
    statusCode = 400;
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    message = errors[0]?.message || "Validation failed";
  } else if (err.name === "CastError") {
    // Galat ObjectId format
    statusCode = 400;
    message = `Invalid ${err.path || "id"}`;
    errors = [];
  } else if (err.name === "BSONError") {
    statusCode = 400;
    message = "Invalid id";
    errors = [];
  } else if (err.code === 11000) {
    // Duplicate key (unique index)
    const field = Object.keys(err.keyValue || {})[0] || "Field";
    statusCode = 409;
    message = `${field} already exists`;
    errors = [];
  } else if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError"
  ) {
    statusCode = 401;
    message = "Invalid or expired token";
    errors = [];
  } else if (err instanceof multer.MulterError) {
    statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    errors = [];
  } else if (err.type === "entity.too.large") {
    statusCode = 413;
    message = "Request body too large";
    errors = [];
  } else if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON body";
    errors = [];
  }

  if (statusCode >= 500) {
    console.error(err);
    if (isProd) message = "Internal Server Error";
  }

  return res.status(statusCode).json({
    statusCode,
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [],
    data: null,
    ...(!isProd && statusCode >= 500 && { stack: err.stack }),
  });
});

// App ko export karein taake server.js isko use kar sake
export { app };
