import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    // Simpan id user agar pesan bisa dihapus oleh pemiliknya.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Message', messageSchema);
