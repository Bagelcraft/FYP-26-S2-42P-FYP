const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const c = require('../controllers/notification.controller');

const router = express.Router();

// Notifications are per-user; any authenticated role manages their own.
router.use(verifyToken);

router.get('/',               c.list);
router.get('/unread-count',   c.unreadCount);
router.post('/',              c.create);
router.patch('/read-all',     c.markAllRead);
router.patch('/:id/read',     c.markRead);
router.delete('/:id',         c.remove);

module.exports = router;
