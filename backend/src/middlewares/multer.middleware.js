import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({ storage: storage });

// --- MEMORY STORAGE FOR VIDEO WITH EXTENSION FILTER ---
const videoMemoryStorage = multer.memoryStorage();

export const uploadVideoFields = multer({
  storage: videoMemoryStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB Max
  },
  fileFilter: (req, file, cb) => {
    // 1. Thumbnail Check
    if (file.fieldname === "thumbnail") {
      if (file.mimetype.startsWith("image/")) {
        return cb(null, true);
      } else {
        return cb(new Error("Thumbnail must be an image!"), false);
      }
    }

    // 2. Video Check
    if (file.fieldname === "video") {
      const isVideoMime = file.mimetype.startsWith("video/");
      const allowedExtensions = [
        ".mp4",
        ".mkv",
        ".mov",
        ".avi",
        ".webm",
        ".flv",
        ".3gp",
      ];
      const fileExt = path.extname(file.originalname).toLowerCase();
      const isAllowedExt = allowedExtensions.includes(fileExt);

      if (isVideoMime && isAllowedExt) {
        return cb(null, true);
      } else {
        return cb(
          new Error(
            "Invalid video format! Only standard video formats are allowed.",
          ),
          false,
        );
      }
    }

    // Agar koi aur field ho to reject kar dein
    cb(new Error("Unknown field name!"), false);
  },
});
