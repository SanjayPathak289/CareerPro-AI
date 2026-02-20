import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import { Resend } from 'resend';
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database Setup
const db = new Database('careerpro.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS otps (
    email TEXT PRIMARY KEY,
    otp TEXT,
    expires_at INTEGER
  );
`);

// Resend Setup
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper: Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Endpoint: Send OTP
app.post('/api/auth/send-otp', asyncHandler(async (req, res) => {
    const { email, name } = req.body;

    if (!email) {
        res.status(400);
        throw new Error('Email is required');
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    // Store OTP in database
    const upsertOTP = db.prepare('INSERT OR REPLACE INTO otps (email, otp, expires_at) VALUES (?, ?, ?)');
    upsertOTP.run(email, otp, expiresAt);

    // Send Email via Resend
    await resend.emails.send({
        from: 'CareerPro AI <onboarding@resend.dev>', // Change to your verified domain later
        to: email,
        subject: `Your Verification Code: ${otp}`,
        html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4f46e5;">CareerPro AI</h2>
        <p>Hello ${name || 'there'},</p>
        <p>Your verification code for CareerPro AI is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; margin: 20px 0;">${otp}</div>
        <p style="color: #64748b; font-size: 14px;">This code will expire in 10 minutes.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `,
    });

    res.status(200).json({ message: 'OTP sent successfully' });
}));

// Endpoint: Verify OTP
app.post('/api/auth/verify-otp', asyncHandler(async (req, res) => {
    const { email, otp, name } = req.body;

    if (!email || !otp) {
        res.status(400);
        throw new Error('Email and OTP are required');
    }

    // Check OTP from database
    const getOTP = db.prepare('SELECT * FROM otps WHERE email = ?');
    const record = getOTP.get(email);

    if (!record || record.otp !== otp || record.expires_at < Date.now()) {
        res.status(401);
        throw new Error('Invalid or expired OTP');
    }

    // OTP is valid, delete it
    const deleteOTP = db.prepare('DELETE FROM otps WHERE email = ?');
    deleteOTP.run(email);

    // Check if user exists or create new one
    const getUser = db.prepare('SELECT * FROM users WHERE email = ?');
    let user = getUser.get(email);

    if (!user) {
        const userId = crypto.randomUUID();
        const insertUser = db.prepare('INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)');
        insertUser.run(userId, email, name || '', Date.now());
        user = { id: userId, email, name, created_at: Date.now() };
    }

    // Generate JWT
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '30d',
    });

    res.status(200).json({
        user,
        token,
        message: 'Authentication successful',
    });
}));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
