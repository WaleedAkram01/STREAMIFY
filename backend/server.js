// Env sab se pehle load honi chahiye: ESM mein imports baaki code se pehle chalte hain,
// isliye dotenv.config() neeche likhne se cloudinary.js jaisi files ko env nahi milti thi
import "dotenv/config";
import connectDB from "./src/config/db.js";
import { app } from "./app.js";

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
    process.exit(1);
  });
