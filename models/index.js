import mongoose from 'mongoose';
import PostSchema from './schemas/board.js';

export const Post = mongoose.model('Post', PostSchema);