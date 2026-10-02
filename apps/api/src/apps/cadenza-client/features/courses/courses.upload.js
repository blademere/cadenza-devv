import multer from 'multer';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  cb(null, true);
};

export const uploadCourseMaterials = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
  fileFilter,
});