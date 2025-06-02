const multer = require('multer');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file types
    const filetypes = /jpeg|jpg|png|gif|mp3|wav|mp4|webm/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Supported formats: images (jpeg, jpg, png, gif), audio (mp3, wav), video (mp4, webm)'));
    }
  }
});

// Middleware for handling single file upload
const handleSingleUpload = (req, res, next) => {
  const uploadSingle = upload.single('file');

  uploadSingle(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    // File uploaded successfully to memory, continue
    next();
  });
};

// Middleware for handling multiple file uploads
const handleMultipleUploads = (req, res, next) => {
  const uploadMultiple = upload.array('files', 10); // Max 10 files

  uploadMultiple(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    // Files uploaded successfully to memory, continue
    next();
  });
};

// Upload a single file to Cloudinary
const uploadSingleFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Get file type (image, video, audio)
    const fileType = req.file.mimetype.split('/')[0];

    // Create a readable stream from buffer
    const fileStream = Readable.from(req.file.buffer);

    // Create a promise to handle the stream upload
    const streamUpload = (stream) => {
      return new Promise((resolve, reject) => {
        const uploadOptions = {
          folder: req.query.folder || 'uploads',
          resource_type: fileType
        };

        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        stream.pipe(uploadStream);
      });
    };

    // Perform the upload
    const result = await streamUpload(fileStream);

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        resource_type: result.resource_type,
        format: result.format,
        original_filename: req.file.originalname
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message
    });
  }
};

// Upload multiple files to Cloudinary
const uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadResults = [];

    // Process each file
    for (const file of req.files) {
      // Get file type (image, video, audio)
      const fileType = file.mimetype.split('/')[0];

      // Create a readable stream from buffer
      const fileStream = Readable.from(file.buffer);

      // Create a promise to handle the stream upload
      const streamUpload = (stream) => {
        return new Promise((resolve, reject) => {
          const uploadOptions = {
            folder: req.query.folder || 'uploads',
            resource_type: fileType
          };

          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );

          stream.pipe(uploadStream);
        });
      };

      // Perform the upload
      const result = await streamUpload(fileStream);

      uploadResults.push({
        url: result.secure_url,
        public_id: result.public_id,
        resource_type: result.resource_type,
        format: result.format,
        original_filename: file.originalname
      });
    }

    res.status(201).json({
      success: true,
      message: `${uploadResults.length} files uploaded successfully`,
      data: uploadResults
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading files',
      error: error.message
    });
  }
};

// Delete a file from Cloudinary
const deleteFile = async (req, res) => {
  try {
    const { public_id, resource_type = 'image' } = req.body;

    if (!public_id) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    // Delete the file
    const result = await cloudinary.uploader.destroy(public_id, { resource_type });

    if (result.result === 'ok') {
      res.status(200).json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'File not found or could not be deleted'
      });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message
    });
  }
};

// Test connection API
const testConnection = async (req, res) => {
  try {
    // Test Cloudinary connection
    const testResult = await cloudinary.api.ping();

    res.status(200).json({
      success: true,
      message: 'Upload service is working correctly',
      data: {
        cloudinary_status: 'connected',
        timestamp: new Date().toISOString(),
        service: 'Upload Controller',
        ping_result: testResult
      }
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      success: false,
      message: 'Upload service connection failed',
      error: error.message,
      data: {
        cloudinary_status: 'disconnected',
        timestamp: new Date().toISOString(),
        service: 'Upload Controller'
      }
    });
  }
};

module.exports = {
  handleSingleUpload,
  handleMultipleUploads,
  uploadSingleFile,
  uploadMultipleFiles,
  deleteFile,
  testConnection
};
