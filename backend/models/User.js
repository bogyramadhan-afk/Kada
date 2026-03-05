import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    // Nama dipakai untuk tampilan sederhana di frontend.
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('User', userSchema);
