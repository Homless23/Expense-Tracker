const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
    getUsers,
    getLoginEvents,
    createUserByAdmin,
    deleteUserByAdmin,
    cleanupCategoryDuplicatesForAllUsers,
    seedRandomEntriesForAdmin
} = require('../controllers/adminController');

router.get('/users', protect, adminOnly, getUsers);
router.get('/logins', protect, adminOnly, getLoginEvents);
router.post('/users', protect, adminOnly, createUserByAdmin);
router.delete('/users/:id', protect, adminOnly, deleteUserByAdmin);
router.post('/categories/cleanup-duplicates', protect, adminOnly, cleanupCategoryDuplicatesForAllUsers);
router.post('/seed-random-entries', protect, adminOnly, seedRandomEntriesForAdmin);

module.exports = router;
