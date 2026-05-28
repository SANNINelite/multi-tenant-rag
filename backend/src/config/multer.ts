import multer from "multer";
import fs from "fs";

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// currently storing files on disk,
// can be migrated later to AWS S3 / Cloudinary

const storage = multer.diskStorage({

  destination: (
    _req,
    _file,
    cb
  ) => {

    cb(null, "uploads/");
  },

  filename: (
    _req,
    file,
    cb
  ) => {

    const uniqueName =
      `${Date.now()}-${file.originalname}`;

    cb(null, uniqueName);
  },
});

export const upload =
  multer({
    storage,
  });