const express = require('express');
const router = express.Router();
const {
    submitIssue,
    trackIssue,
    getMyIssues,
    getAllIssues,
    replyToIssue,
    getIssueStats
} = require('../controllers/support.controller');

const { verifyToken, verifyAdminToken } = require('../middleware/authMiddleware');
const uploadSupport = require('../middleware/uploadSupport');

// ── User Routes ──────────────────────────────
// POST /api/support/submit          – submit a new issue (auth required)
router.post('/submit', verifyToken, uploadSupport.single('attachment'), submitIssue);

// GET  /api/support/my-issues       – get issues for logged-in user
router.get('/my-issues', verifyToken, getMyIssues);

// GET  /api/support/track/:issue_id – public track by Issue ID
router.get('/track/:issue_id', trackIssue);

// ── Admin Routes ─────────────────────────────
// GET  /api/support/admin/all       – get all issues (admin)
router.get('/admin/all', verifyAdminToken, getAllIssues);

// GET  /api/support/admin/stats     – issue counts by status
router.get('/admin/stats', verifyAdminToken, getIssueStats);

// PUT  /api/support/admin/reply/:id – reply to issue (admin)
router.put('/admin/reply/:id', verifyAdminToken, replyToIssue);

module.exports = router;
