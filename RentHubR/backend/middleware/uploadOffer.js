const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only images (JPG, PNG, WEBP) are allowed'), false);
    }
};

const uploadOffer = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for offer images
    fileFilter: fileFilter
});

module.exports = uploadOffer;
