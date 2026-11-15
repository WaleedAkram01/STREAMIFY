import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// 1-HEALTHCHECK CONTROLLER
export const healthcheck = asyncHandler(async (req, res) => {
  // readyState 1 = connected
  const dbStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { status: "OK", db: dbStatus, uptime: process.uptime() },
        "Everything is O.K",
      ),
    );
});
