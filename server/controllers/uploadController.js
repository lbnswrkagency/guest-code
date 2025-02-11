const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const folder = req.body.folder || "uploads";
    const uploadPath = path.join(__dirname, "..", "uploads", folder);

    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPEG, PNG, GIF and WebP are allowed."),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Handle image upload
const handleImageUpload = (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(413)
            .json({ message: "File is too large. Maximum size is 5MB." });
        }
        return res.status(400).json({ message: err.message });
      }
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    // Generate URL for the uploaded file
    const folder = req.body.folder || "uploads";
    const fileUrl = `/uploads/${folder}/${req.file.filename}`;

    res.json({
      message: "File uploaded successfully",
      url: fileUrl,
    });
  });
};

// Handle image deletion
const handleImageDelete = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: "No image URL provided" });
    }

    // Extract the file path from the URL
    const filePath = path.join(__dirname, "..", imageUrl);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Delete the file
    await fs.unlink(filePath);
    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({ message: "Failed to delete image" });
  }
};

module.exports = {
  handleImageUpload,
  handleImageDelete,
};
