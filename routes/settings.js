const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Middleware to check if a user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'You need to be logged in to view this page.');
    res.redirect('/auth/login');
}

// GET /settings (show the settings page)
router.get('/', ensureAuthenticated, (req, res) => {
    res.render('settings', { user: req.user });
});

// POST /settings/change-password (handle password change)
router.post('/change-password', ensureAuthenticated, async (req, res) => {
    const { oldPassword, newPassword, newPassword2 } = req.body;
    const user = req.user;

    // Check if new passwords match
    if (newPassword !== newPassword2) {
        req.flash('error_msg', 'New passwords do not match.');
        return res.redirect('/settings');
    }

    try {
        // Verify the old password
        const isMatch = await user.comparePassword(oldPassword);
        if (!isMatch) {
            req.flash('error_msg', 'Old password is incorrect.');
            return res.redirect('/settings');
        }

        // Hash and save the new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        req.flash('success_msg', 'Password has been successfully changed.');
        res.redirect('/settings');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'An error occurred while changing the password.');
        res.redirect('/settings');
    }
});

module.exports = router;