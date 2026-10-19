import mongoose from "mongoose";
import dotenv from "dotenv";
import { DB_NAME } from "../utils/constants.js";

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);

    console.log(`\n MongoDB Connected! DB Host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
