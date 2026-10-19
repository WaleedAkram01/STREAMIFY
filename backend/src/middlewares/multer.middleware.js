import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  // 1. Destination: File ko local server par kahan save karna hai
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },

  // 2. Filename: Har file ka unique naam banana taake koi file overwrite na ho
  filename: function (req, file, cb) {
    // Date.now() + random number = har dafa alag naam
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

    // Asli file ka extension nikalna (e.g. ".jpg", ".png")
    const ext = path.extname(file.originalname);

    // Final naam: avatar-1729180000000-482913765.jpg
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// Export the middleware
export const upload = multer({
  storage: storage,
});
