import multer from "multer";
import path from "path";

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueName + path.extname(file.originalname));
    }
});

// File filter (optional but good)
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "application/pdf"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
        cb(new Error("Only PDF, JPG, PNG files are allowed"), false);
    } else {
        cb(null, true);
    }
};

const upload = multer({
    storage,
    fileFilter
});

export default upload;
