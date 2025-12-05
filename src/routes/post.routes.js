const router = require('express').Router();
const { createPost, getPosts, getPost, addReaction, addComment, reportPost, deletePost } = require('../controllers/post.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', getPosts);
router.get('/:id', getPost);
router.post('/', protect, createPost);
router.post('/:id/reaction', protect, addReaction);
router.post('/:id/comment', protect, addComment);
router.post('/:id/report', protect, reportPost);
router.delete('/:id', protect, deletePost);

module.exports = router;
