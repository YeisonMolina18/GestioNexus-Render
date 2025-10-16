// helpers/cloudinary.config.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'gestionexus_profiles', // Nombre de la carpeta en Cloudinary
        allowed_formats: ['jpeg', 'png', 'jpg'],
    },
});

module.exports = {
    cloudinary,
    storage
};