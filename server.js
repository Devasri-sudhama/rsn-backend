// ===============================
// BASIC SETUP
// ===============================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const fs = require('fs');

const app = express();

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors({ origin: '*' }));
app.use(express.json());

// ===============================
// MULTER CONFIG (FILE UPLOAD)
// ===============================
const uploadDir = 'uploads';

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

// ===============================
// NODEMAILER CONFIG (GMAIL)
// ===============================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ===============================
// VERIFY SMTP (NON-BLOCKING)
// ===============================
transporter.verify((error) => {
    if (error) {
        console.error('❌ SMTP ERROR:', error.message);
    } else {
        console.log('✅ SMTP READY');
    }
});

// ===============================
// CAREERS API ROUTE
// ===============================
app.post('/api/careers/apply', upload.single('resume'), async (req, res) => {
    try {
        console.log('📩 FORM DATA:', req.body);
        console.log('📎 FILE:', req.file);

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Resume file missing'
            });
        }

        const { name, email, phone, position, message } = req.body;
        const formattedPosition = formatPosition(position);

        const mailOptions = {
            from: `"Career Portal" <${process.env.EMAIL_USER}>`,
            to: process.env.HR_EMAIL,
            subject: `RSN & Co New Job Application – ${formattedPosition}`,
            html: `
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone}</p>
                <p><strong>Position:</strong> ${formattedPosition}</p>
                <p>${message}</p>
            `,
            attachments: [
                {
                    filename: req.file.originalname,
                    path: req.file.path
                }
            ]
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({
            success: true,
            message: 'Application submitted successfully'
        });

    } catch (err) {
        console.error('❌ SERVER ERROR:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to send email'
        });
    }
});

// ===============================
// CONTACT API ROUTE (FIXED)
// ===============================
app.post('/api/contact', async (req, res) => {
    try {
        console.log('📩 CONTACT FORM RECEIVED:', req.body);

        const { name, email, phone, subject, preferredContact, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const mailOptions = {
            from: `"Website Contact" <${process.env.EMAIL_USER}>`,
            to: process.env.HR_EMAIL,
            replyTo: email,
            subject: `Contact Form: ${subject || 'New Inquiry'}`,
            html: `
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone || '-'}</p>
                <p><strong>Preferred Contact:</strong> ${preferredContact || '-'}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({
            success: true,
            message: 'Contact message sent successfully'
        });

    } catch (err) {
        console.error('❌ CONTACT ERROR:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to send contact email'
        });
    }
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// ===============================
// HELPER
// ===============================
function formatPosition(value) {
    const map = {
        chartered_accountant: 'Chartered Accountant',
        articleship: 'Articleship',
        others: 'Others'
    };
    return map[value] || value;
}
