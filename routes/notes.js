import { Router } from 'express';
import { Post } from '../models/index.js';

const router = Router();

// 1. GET ALL (READ) - Mengambil semua post dari MongoDB
router.get('/', async (req, res, next) => {
    try {
        // Menggunakan Post.find() dari Mongoose
        const posts = await Post.find({}); 
        res.json(posts);
    } catch (e) {
        next(e);
    }
});

// 2. GET BY ID (READ) - Mengambil satu post berdasarkan ID
router.get('/:id', async (req, res, next) => {
    const { id } = req.params; // MongoDB ID biasanya string, tidak perlu Number()
    try {
        // Menggunakan Post.findById() dari Mongoose
        const post = await Post.findById(id);
        
        if (!post) {
            return res.status(404).json({ message: "Post tidak ditemukan" });
        }
        
        res.json(post);
    } catch (e) {
        next(e);
    }
});

// 3. POST (CREATE) - Membuat data baru
router.post('/', async (req, res, next) => {
    const { title, content } = req.body;
    
    if (!title || !content) {
        return res.status(400).json({ message: "Title dan content harus diisi" });
    }

    try {
        const post = await Post.create({ title, content });
        res.status(201).json(post);
    } catch (e) {
        next(e);
    }
});

export default router;

// import { Router } from 'express';
// import { Post } from '../models/index.js';

// const router = Router();

// // 1. GET ALL (READ) - Mengambil semua post dari MongoDB
// router.get('/', async (req, res, next) => {
//     try {
//         // Menggunakan Post.find() dari Mongoose
//         // const posts = await Post.find({}); 
//         res.json({"dor":"ahhk"});
//     } catch (e) {
//         next(e);
//     }
// });

// // 2. GET BY ID (READ) - Mengambil satu post berdasarkan ID
// router.get('/:id', async (req, res, next) => {
//     const { id } = req.params; // MongoDB ID biasanya string, tidak perlu Number()
//     try {
//         // Menggunakan Post.findById() dari Mongoose
//         const post = await Post.findById(id);
        
//         if (!post) {
//             return res.status(404).json({ message: "Post tidak ditemukan" });
//         }
        
//         res.json(post);
//     } catch (e) {
//         next(e);
//     }
// });

// // 3. POST (CREATE) - Membuat data baru
// router.post('/', async (req, res, next) => {
//     const { title, content } = req.body;
    
//     if (!title || !content) {
//         return res.status(400).json({ message: "Title dan content harus diisi" });
//     }

//     try {
//         const post = await Post.create({ title, content });
//         res.status(201).json(post);
//     } catch (e) {
//         next(e);
//     }

// });

// router.put('/:id', async (req, res, next) => {
//     const { id } = req.params;
//     const { title, content } = req.body;    

//     try {
//         const post = await Post.findByIdAndUpdate(id, { title, content }, { new: true });
//         if (!post) {
//             return res.status(404).json({ message: "Post tidak ditemukan" });
//         }
//         res.json(post);
//     } catch (e) {
//         next(e);
//     }
// });

// delete router.delete('/:id', async (req, res, next) => {
//     const { id } = req.params;  
//     try {
//         const post = await Post.findByIdAndDelete(id);
//         if (!post) {
//             return res.status(404).json({ message: "Post tidak ditemukan" });
//         }
//         res.json({ message: "Post berhasil dihapus" });
//     } catch (e) {
//         next(e);
//     }
// });

// export default router;
