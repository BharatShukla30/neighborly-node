const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Please enter username"],
    unique: true,
  },
  password: {
    type: String,
  },
  picture: {
    type: String,
  },
  gender: {
    type: String,
  },
  dob: {
    type: Date,
  },
  email: {
    type: String,
    required: [true, "Please enter email"],
    unique: true,
  },
  current_coordinates: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: [28.5643, 77.2442],
    },
  },
  home_coordinates: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: [28.5643, 77.2442],
    },
  },
  findMe: {
    type: Boolean,
    default: true,
  },
  groups: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },
  ],
  karma: {
    type: Number,
    default: 1000,
  },
  auth_type: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
  },
  otpExpiry: {
    type: Date,
  }
});

userSchema.pre("save", async function () {
  if (this.password !== undefined)
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.getJWTToken = function (expiry, secret) {
  return jwt.sign({ id: this._id }, secret, {
    expiresIn: expiry,
  });
};

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Add 2dsphere index on current_coordinates
userSchema.index({ current_coordinates: "2dsphere" });
userSchema.index({ city: "2dsphere" });
module.exports = mongoose.model("User", userSchema);
