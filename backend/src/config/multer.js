import multer from "multer";
import path from "path";

/**
 * Multer storage configuration
 *
 * Defines where uploaded files are stored
 * and how filenames are generated.
 */
const storage = multer.diskStorage({
    // Destination folder for uploaded files
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },

    // Generate a unique filename to avoid collisions
    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1e9);

        // Preserve original file extension
        cb(null, uniqueName + path.extname(file.originalname));
    }
});

/**
 * File filter configuration
 *
 * Restricts uploads to specific MIME types
 * to improve security and data consistency.
 */
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "application/pdf"
    ];

    // Reject unsupported file types
    if (!allowedTypes.includes(file.mimetype)) {
        cb(new Error("Only PDF, JPG, PNG files are allowed"), false);
    } else {
        cb(null, true);
    }
};

/**
 * Multer upload middleware
 *
 * Combines storage and file filtering logic.
 * Can be used in routes as:
 *   upload.single("file")
 *   upload.array("files")
 */
const upload = multer({
    storage,
    fileFilter
});

// Export configured upload middleware
export default upload;
