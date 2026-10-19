import dotenv from "dotenv";
import connectDB from "./src/config/db.js"; // Aapki db.js ka sahi path (.js extension zaroori hai)
import { app } from "./app.js";

// Dotenv configuration sabse upar honi chahiye
dotenv.config({
  path: "./.env",
});

const PORT = process.env.PORT || 8000;

// Database connect karein aur phir server start karein
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`⚙️  Server is running at port : ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("❌ MongoDB connection failed !!! ", err);
  });
