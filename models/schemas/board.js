import { Schema } from 'mongoose';

const PostSchema = new Schema({
  title: String,
  content: String,
}, {
  timestamps: true,
});

export default PostSchema;