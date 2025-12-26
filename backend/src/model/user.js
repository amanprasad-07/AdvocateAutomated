import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * User schema representing registered application users.
 * Stores identity information, role-based attributes,
 * and securely hashed authentication credentials.
 */
const userSchema = new mongoose.Schema(
    {
        // Full name of the user
        name: {
            type: String,
            required: true,
            trim: true // Removes unnecessary whitespace around names
        },

        // Unique email address used for login and communication
        email: {
            type: String,
            required: true,
            unique: true, // Enforces unique email at database index level
            lowercase: true, // Normalizes email to prevent case-sensitive duplicates
            trim: true,
            match: [
                /^\S+@\S+\.\S+$/,
                "Please provide a valid email address"
            ]
        },

        // Residential or professional address of the user
        address: {
            type: String,
            required: true,
            trim: true // Removes unnecessary whitespace around address
        },

        // Contact phone number
        phone: {
            type: String,
            required: true,
            trim: true,
            minlength: 8
        },

        // Hashed user password (never returned in queries)
        password: {
            type: String,
            required: [true, 'Please provide a password'],
            minlength: 8,
            select: false // Explicitly excludes password from query results
        },

        // Password confirmation field used only during creation/update
        passwordConfirm: {
            type: String,
            required: function () {
                // Required only when creating a new user
                // or when the password field is modified
                return this.isNew || this.isModified("password");
            },
            validate: {
                // Custom validator to ensure passwords match
                validator: function (el) {
                    return el === this.password;
                },
                message: "Passwords are not the same!"
            }
        },

        // Role-based access control for the application
        role: {
            type: String,
            required: true,
            enum: ["client", "advocate", "junior_advocate", "admin"],
            default: "client" // Default role for newly created users
        },

        // Verification workflow status for advocates
        verificationStatus: {
            type: String,
            enum: ["not_required", "pending", "approved", "rejected"],
            default: function () {
                // Clients bypass verification entirely
                return this.role === "client" ? "not_required" : "pending";
            }
        },

        // Soft-activation flag for account access control
        isActive: {
            type: Boolean,
            default: true
        },

        // Timestamp of when verification was reviewed
        verificationReviewedAt: {
            type: Date
        },

        // Admin or authority who reviewed the verification
        verificationReviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        // Advocate-specific professional details
        advocateProfile: {
            enrollmentNumber: String,
            barCouncil: String,
            experienceYears: Number,
            documents: [String] // File paths or document identifiers
        },

        // Tracks last successful login time
        lastLoginAt: {
            type: Date
        }
    },
    {
        // Automatically manages createdAt and updatedAt fields
        timestamps: true
    }
);

/**
 * Pre-save hook for password hashing.
 * Executes only when the password field is modified.
 */
userSchema.pre("save", async function () {
    // Skip hashing if password has not been modified
    if (!this.isModified("password")) return;

    // Hash the password with a cost factor of 12
    this.password = await bcrypt.hash(this.password, 12);

    // Remove passwordConfirm field before saving to database
    this.passwordConfirm = undefined;
});

/**
 * Pre-validation hook for enforcing role-based data integrity.
 * Ensures verification rules remain consistent across user types.
 */
userSchema.pre("validate", function () {
    // Clients never require verification
    if (this.role === "client") {
        this.verificationStatus = "not_required";
    }

    // Advocates must never have a "not_required" verification status
    if (
        (this.role === "advocate" || this.role === "junior_advocate") &&
        this.verificationStatus === "not_required"
    ) {
        this.verificationStatus = "pending";
    }

    // Remove advocate-specific profile data for client accounts
    if (this.role === "client") {
        this.advocateProfile = undefined;
    }
});

/**
 * Instance method to validate a candidate password
 * against the stored hashed password.
 */
userSchema.methods.correctPassword = async function (
    candidatePassword,
    userPassword
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

// Export User model for use in authentication, authorization,
// and role-based access control across the application
export default mongoose.model("User", userSchema);
