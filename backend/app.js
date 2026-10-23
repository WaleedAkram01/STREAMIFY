import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoutes from "./src/routes/user.routes.js";
import videoRoutes from "./src/routes/video.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);

app.use(express.json({ limit: "20gb" }));
app.use(express.urlencoded({ extended: true, limit: "20gb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Use the user routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/videos", videoRoutes);

// Sample Route (Testing ke liye)
app.get("/", (req, res) => {
  res.json({ message: "API is working perfectly!" });
});

//  Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  return res.status(statusCode).json({
    statusCode,
    success: false,
    message: err.message || "Internal Server Error",
    errors: err.errors || [],
    data: null,
  });
});
// App ko export karein taake server.js isko use kar sake
export { app };
