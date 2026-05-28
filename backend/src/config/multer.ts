import multer from "multer";
//currently storing files on disk, can be changed to cloud storage like AWS S3 or Google Cloud Storage in the future
const storage = multer.diskStorage({

  destination: (
    _req,
    _file,
    cb
  ) => {

    cb(null, "src/uploads");
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