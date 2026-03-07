import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123'; // Fallback for dev

// Signup
router.post('/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.create({ email, password, name });
        
        // Generate token immediately for auto-login
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({ 
            success: true, 
            user, 
            token 
        });
    } catch (error) {
        console.error('Signup Error:', error);
        res.status(400).json({ error: error.message || 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await User.validatePassword(user, password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

        // Don't send password back
        const { password: _, ...userWithoutPassword } = user;

        res.json({ 
            success: true, 
            user: userWithoutPassword, 
            token 
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Me (Protected)
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.id);
            
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const { password: _, ...userWithoutPassword } = user;
            res.json({ success: true, user: userWithoutPassword });
        } catch (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    } catch (error) {
        console.error('Me Error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

export default router;
