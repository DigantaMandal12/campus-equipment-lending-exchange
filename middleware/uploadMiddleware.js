const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDirectory = path.join(
  __dirname,
  "..",
  "public",
  "uploads",
  "equipment"
);

// Ensure upload directory exists.
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true
  });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory);
  },

  filename: function (req, file, cb) {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    const uniqueName =
      `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${extension}`;

    cb(null, uniqueName);
  }
});

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

const fileFilter = function (
  req,
  file,
  cb
) {
  if (
    !allowedMimeTypes.includes(
      file.mimetype
    )
  ) {
    return cb(
      new Error(
        "Only JPG, JPEG, PNG and WEBP images are allowed."
      )
    );
  }

  cb(null, true);
};

const uploadEquipmentImages =
  multer({
    storage,
    fileFilter,

    limits: {
      files: 5,
      fileSize: 2 * 1024 * 1024
    }
  });

module.exports = {
  uploadEquipmentImages
};