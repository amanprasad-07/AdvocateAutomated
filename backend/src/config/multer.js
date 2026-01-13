import multer from "multer";

/**
 * Multer storage configuration.
 *
 * Uses in-memory storage so files are kept in RAM
 * and can be processed or forwarded immediately
 * (for example, to cloud storage services).
 */
const storage = multer.memoryStorage();

/**
 * File filter configuration.
 *
 * Validates uploaded files based on MIME type.
 * Only explicitly supported document, image, audio,
 * and video formats are accepted.
 *
 * @param {Object} req - Express request object
 * @param {Object} file - File object provided by Multer
 * @param {Function} cb - Callback to signal acceptance or rejection
 */
const fileFilter = (req, file, cb) => {
    const mime = file.mimetype;

    // -------- Documents --------
    // Allows common document formats used for legal and textual evidence
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
    // Allows all standard image formats (jpeg, png, webp, etc.)
    if (mime.startsWith("image/")) {
        return cb(null, true);
    }

    // -------- Audio --------
    // Allows audio evidence such as voice recordings
    if (mime.startsWith("audio/")) {
        return cb(null, true);
    }

    // -------- Video --------
    // Allows video evidence such as recordings or clips
    if (mime.startsWith("video/")) {
        return cb(null, true);
    }

    // -------- Reject everything else --------
    // Any unsupported MIME type is rejected with a clear error
    cb(
        new Error(
            "Unsupported file type. Allowed: documents, images, audio, video."
        ),
        false
    );
};

/**
 * Multer upload middleware.
 *
 * Combines storage, file filtering, and size limits
 * into a reusable middleware for file uploads.
 */
const upload = multer({
    storage,
    fileFilter,
    limits: {
        // Maximum allowed file size per upload
        fileSize: 500 * 1024 * 1024, // 500 MB safeguard
    },
});

export default upload;
