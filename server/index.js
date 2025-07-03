const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure the uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Use the user's UID as the filename, preserving the original extension
    const userId = req.headers['x-user-id']; // Assuming UID is sent in a custom header
    if (!userId) {
      return cb(new Error('User ID not provided in x-user-id header'));
    }
    const ext = path.extname(file.originalname);
    cb(null, `${userId}${ext}`);
  },
});

const upload = multer({ storage: storage });

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(UPLOADS_DIR));

// CORS for development (adjust for production)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allow all origins for now
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-user-id');
  next();
});

// Upload endpoint
app.post('/upload-profile-pic', upload.single('profilePic'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  // Respond with the URL to the uploaded file
  const fileUrl = `/uploads/${req.file.filename}`;
  res.status(200).json({ message: 'File uploaded successfully', url: fileUrl });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Image server running on port ${PORT}`);
});
