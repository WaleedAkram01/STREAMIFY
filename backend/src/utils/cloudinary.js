import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { Readable } from "stream"; // FIX 1: Yeh native module import hona zaroori hai buffer pipe ke liye

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// METHOD 1: Existing Method For Images / Local Files (Disk Storage)
export const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return response;
  } catch (error) {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

// METHOD 2: New Method For Heavy Videos (Memory Storage Buffer Stream)
export const uploadVideoOnCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer) return resolve(null);

    // FIX 2: upload_large_stream ki jagah 'upload_chunked_stream' use hota hai SDK mein
    const cld_upload_stream = cloudinary.uploader.upload_chunked_stream(
      {
        resource_type: "video",
        chunk_size: 6000000, // 6MB chunks background pipeline
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    Readable.from(fileBuffer).pipe(cld_upload_stream);
  });
};

// METHOD 3: New Method For Custom Thumbnail Image (Memory Storage Buffer Stream)
export const uploadImageBufferOnCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer) return resolve(null);

    const cld_upload_stream = cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    Readable.from(fileBuffer).pipe(cld_upload_stream);
  });
};

// To delete from cloudinary
// resourceType: "image" (default) ya "video" (video delete karte waqt zaroori hai)
export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    if (!publicId) return null;
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
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
