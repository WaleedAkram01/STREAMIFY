import { Router } from "express";
import {
  PublishAVideo,
  getAllVideos,
  updateVideo,
  getVideoById,
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
// Bilkul sahi naam jo aapne abhi dikhaya:
import { uploadVideoFields, upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/get-all", getAllVideos);

router.post(
  "/publish-video",
  uploadVideoFields.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  PublishAVideo,
);

router.get("/get-video/:videoId", getVideoById);

router.patch("/update-video/:videoId", upload.single("thumbnail"), updateVideo);

export default router;
