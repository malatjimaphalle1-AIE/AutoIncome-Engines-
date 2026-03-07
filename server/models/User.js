import { loadData, saveData } from '../utils/db.js';
import bcrypt from 'bcryptjs';

const User = {
    async create(userData) {
        const data = loadData();
        
        // Check if email already exists
        if (data.users.some(u => u.email === userData.email)) {
            throw new Error('Email already registered');
        }

        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        const newUser = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            email: userData.email,
            password: hashedPassword,
            name: userData.name || '',
            createdAt: new Date().toISOString(),
            role: 'user' // Default role
        };

        data.users.push(newUser);
        saveData(data);
        
        // Don't return password
        const { password, ...userWithoutPassword } = newUser;
        return userWithoutPassword;
    },

    async findByEmail(email) {
        const data = loadData();
        return data.users.find(u => u.email === email);
    },

    async findById(id) {
        const data = loadData();
        return data.users.find(u => u.id === id);
    },
    
    async validatePassword(user, password) {
        return bcrypt.compare(password, user.password);
    }
};

export default User;
