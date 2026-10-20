import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // File ko cloudinary par upload karne ka code
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // Pehle check karein agar file sach mein folder mein maujood hai tabhi delete karein
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (error) {
    // Agar upload fail ho jaye, toh check karke safe side par remove karein taake crash na ho
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

// To delete from cloudinary-When updating user profile.
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;

    // Trigger the deletion command on Cloudinary servers
    const response = await cloudinary.uploader.destroy(publicId);

    return response;
  } catch (error) {
    console.error(
      "Failed to delete asset from Cloudinary. Public ID: ",
      publicId,
      error,
    );
    return null;
  }
};
export { uploadOnCloudinary };
