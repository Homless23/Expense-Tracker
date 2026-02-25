const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const LoginEvent = require('../models/LoginEvent');

const MAX_AVATAR_DATA_URL_LENGTH = 1800000;
const AVATAR_DATA_URL_PATTERN = /^data:image\/(png|jpe?g|webp|gif);base64,[a-zA-Z0-9+/=]+$/;

const sanitizeAvatarDataUrl = (value) => {
    const next = String(value || '').trim();
    if (!next) return '';
    if (next.length > MAX_AVATAR_DATA_URL_LENGTH) {
        return null;
    }
    if (!AVATAR_DATA_URL_PATTERN.test(next)) {
        return null;
    }
    return next;
};

// Generate JWT
const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
    }

    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
}

const recordLoginEvent = async ({ user, email, success, req }) => {
    try {
        await LoginEvent.create({
            user: user?._id || null,
            email: String(email || '').trim().toLowerCase(),
            success: Boolean(success),
            role: user?.role || 'unknown',
            ip: req?.ip || req?.headers['x-forwarded-for'] || '',
            userAgent: req?.get?.('user-agent') || ''
        });
    } catch (error) {
        console.log('Failed to record login event:', error.message);
    }
};

// @desc    Register new user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const cleanedName = String(name || '').trim();
    const cleanedPassword = String(password || '');
    const cleanedConfirmPassword = String(confirmPassword || '');
    const hasStrongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(cleanedPassword);

    try {
        if (!cleanedName || !normalizedEmail || !cleanedPassword || !cleanedConfirmPassword) {
            return res.status(400).json({ message: 'Please add all fields' });
        }
        if (cleanedName.length < 2 || cleanedName.length > 60) {
            return res.status(400).json({ message: 'Name must be between 2 and 60 characters' });
        }
        if (!hasStrongPassword) {
            return res.status(400).json({
                message: 'Password must be at least 8 chars and include uppercase, lowercase, number, and symbol'
            });
        }
        if (cleanedPassword !== cleanedConfirmPassword) {
            return res.status(400).json({ message: 'Password and confirm password do not match' });
        }

        // Check if user exists
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user (password hashing is handled in Model)
        const user = await User.create({
            name: cleanedName,
            email: normalizedEmail,
            password: cleanedPassword
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                avatarDataUrl: user.avatarDataUrl || '',
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        // Handle unique index race condition / duplicate insertion attempts cleanly.
        if (error?.code === 11000) {
            return res.status(400).json({ message: 'User already exists' });
        }

        console.log(error);
        res.status(500).json({ message: 'Server Error' });
    }
}

// @desc    Authenticate a user
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    try {
        // Check for user email
        const user = await User.findOne({ email: normalizedEmail });

        const isMatch = user ? await bcrypt.compare(String(password || ''), user.password) : false;
        if (user && isMatch) {
            user.lastLoginAt = new Date();
            await user.save();
            await recordLoginEvent({ user, email: normalizedEmail, success: true, req });
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                avatarDataUrl: user.avatarDataUrl || '',
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            await recordLoginEvent({ user: null, email: normalizedEmail, success: false, req });
            res.status(401).json({ message: 'Invalid Credentials' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server Error' });
    }
}

// @desc    Authenticate an admin user
// @route   POST /api/auth/admin/login
const adminLogin = async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    try {
        const user = await User.findOne({ email: normalizedEmail });
        const isMatch = user ? await bcrypt.compare(String(password || ''), user.password) : false;
        if (!user || !isMatch || user.role !== 'admin') {
            await recordLoginEvent({ user: null, email: normalizedEmail, success: false, req });
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }

        user.lastLoginAt = new Date();
        await user.save();
        await recordLoginEvent({ user, email: normalizedEmail, success: true, req });

        return res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            avatarDataUrl: user.avatarDataUrl || '',
            role: user.role,
            token: generateToken(user._id)
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('_id name email avatarDataUrl createdAt updatedAt');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.json(user);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update current user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
    const { name, avatarDataUrl, removeAvatar } = req.body;
    const nextName = String(name || '').trim();
    const shouldRemoveAvatar = Boolean(removeAvatar);

    try {
        if (!nextName) {
            return res.status(400).json({ message: 'Name is required' });
        }
        if (nextName.length < 2 || nextName.length > 60) {
            return res.status(400).json({ message: 'Name must be between 2 and 60 characters' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (shouldRemoveAvatar) {
            user.avatarDataUrl = '';
        } else if (typeof avatarDataUrl !== 'undefined') {
            const cleanedAvatar = sanitizeAvatarDataUrl(avatarDataUrl);
            if (cleanedAvatar === null) {
                return res.status(400).json({ message: 'Invalid profile image. Use PNG, JPG, WEBP, or GIF under 1.5MB.' });
            }
            user.avatarDataUrl = cleanedAvatar;
        }

        user.name = nextName;
        await user.save();

        return res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            avatarDataUrl: user.avatarDataUrl || ''
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Change current user password
// @route   PUT /api/auth/password
// @access  Private
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Please provide current and new passwords' });
        }
        if (String(newPassword).length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await user.matchPassword(String(currentPassword));
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        user.password = String(newPassword);
        await user.save();

        return res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { registerUser, loginUser, adminLogin, getMe, updateProfile, changePassword };
