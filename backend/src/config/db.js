import mongoose from "mongoose";
import { DB_NAME } from "../utils/constants.js";

const connectDB = async () => {
  try {
    // DB_NAME env se override ho sakta hai (e.g. testing ke liye alag database)
    const dbName = process.env.DB_NAME || DB_NAME;
    const conn = await mongoose.connect(`${process.env.MONGO_URI}/${dbName}`);

    console.log(`\n MongoDB Connected! DB Host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
