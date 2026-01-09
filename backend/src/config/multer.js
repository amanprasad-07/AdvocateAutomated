import multer from "multer";
import path from "path";

/**
 * Multer storage configuration
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1e9);

        cb(null, uniqueName + path.extname(file.originalname));
    },
});

/**
 * File filter configuration
 *
 * Allows all evidence categories supported by the system.
 */
const fileFilter = (req, file, cb) => {
    const mime = file.mimetype;

    // -------- Documents --------
    if (
        mime === "application/pdf" ||
        mime === "application/msword" ||
        mime ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mime === "application/vnd.ms-excel" ||
        mime ===
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        mime === "text/plain"
    ) {
        return cb(null, true);
    }

    // -------- Images --------
    if (mime.startsWith("image/")) {
        return cb(null, true);
    }

    // -------- Audio --------
    if (mime.startsWith("audio/")) {
        return cb(null, true);
    }

    // -------- Video --------
    if (mime.startsWith("video/")) {
        return cb(null, true);
    }

    // -------- Reject everything else --------
    cb(
        new Error(
            "Unsupported file type. Allowed: documents, images, audio, video."
        ),
        false
    );
};

/**
 * Multer upload middleware
 */
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024, // 50 MB safeguard
    },
});

export default upload;
