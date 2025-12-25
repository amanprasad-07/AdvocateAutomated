import mongoose from "mongoose";
import bcrypt from "bcryptjs";


/**
 * User schema representing registered application users.
 * Stores identity information and hashed authentication credentials.
 */
const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true // Removes unnecessary whitespace around names
        },

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

        address: {
            type: String,
            required: true,
            trim: true // Removes unnecessary whitespace around address
        },

        phone: {
            type: String,
            required: true,
            trim: true, // Removes unnecessary whitespace around numbers
            minlength: 8
        },

        password: {
            type: String,
            required: [true, 'Please provide a password'],
            minlength: 8,
            select: false
        },

        passwordConfirm: {
            type: String,
            required: function () {
                return this.isNew || this.isModified("password");
            },
            validate: {
                validator: function (el) {
                    return el === this.password;
                },
                message: "Passwords are not the same!"
            }
        },


        role: {
            type: String,
            required: true,
            enum: ["client", "advocate", "junior_advocate", "admin"],
            default: "client" // Default role for newly created user
        },

        verificationStatus: {
            type: String,
            enum: ["not_required", "pending", "approved", "rejected"],
            default: function () {
                return this.role === "client" ? "not_required" : "pending";
            }
        },

        isActive: {
            type: Boolean,
            default: true
        },

        verificationReviewedAt: {
            type: Date
        },

        verificationReviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        advocateProfile: {
            enrollmentNumber: String,
            barCouncil: String,
            experienceYears: Number,
            documents: [String]
        },

        lastLoginAt: {
            type: Date
        }


    },
    {
        // Automatically adds createdAt and updatedAt timestamps
        timestamps: true
    }
);

userSchema.pre("save", async function () {
    // Only run this function if password was modified
    if (!this.isModified("password")) return;

    // Hash the password
    this.password = await bcrypt.hash(this.password, 12);

    // Remove passwordConfirm field
    this.passwordConfirm = undefined;

});

userSchema.pre("validate", function () {
    // Clients never require verification
    if (this.role === "client") {
        this.verificationStatus = "not_required";
    }

    // Advocates must never be "not_required"
    if (
        (this.role === "advocate" || this.role === "junior_advocate") &&
        this.verificationStatus === "not_required"
    ) {
        this.verificationStatus = "pending";
    }

    if (this.role === "client") {
        this.advocateProfile = undefined;
    }

});

userSchema.methods.correctPassword = async function (
    candidatePassword,
    userPassword
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};



// Export User model for use in authentication and authorization workflows
export default mongoose.model("User", userSchema);

