import { Router } from 'express';
import bcrypt from 'bcrypt';
import { createUser, findUserByEmail } from '../models/userModel.js';
const router = Router();
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // Check if user already exists
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            res.status(400).json({ error: 'Email is already registered' });
            return;
        }
        // Hash the password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        // Save user to database
        const newUser = await createUser(name, email, passwordHash);
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                created_at: newUser.created_at
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
//# sourceMappingURL=authRoutes.js.map