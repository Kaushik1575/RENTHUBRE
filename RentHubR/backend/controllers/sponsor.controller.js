const SponsorModel = require('../models/sponsorModel');
const { uploadToSupabase } = require('../utils/supabaseStorage');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'uploads';

/**
 * Sponsor Registration
 */
exports.registerSponsor = async (req, res) => {
    try {
        const {
            fullName, email, phoneNumber, password, confirmPassword,
            bankAccount, ifscCode, upiId, address
        } = req.body;

        // Check if sponsor already exists
        const existingSponsor = await SponsorModel.getSponsorByEmail(email);
        if (existingSponsor) {
            return res.status(400).json({ error: 'Email already registered as sponsor' });
        }

        // Validate passwords
        if (!confirmPassword) return res.status(400).json({ error: 'Please confirm your password' });
        if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create sponsor account
        const sponsorData = {
            full_name: fullName,
            email,
            phone_number: phoneNumber,
            password: hashedPassword,
            bank_account: bankAccount,
            ifsc_code: ifscCode,
            upi_id: upiId,
            address: address,
            is_blocked: false
        };

        await SponsorModel.createSponsorAccount(sponsorData);

        res.status(201).json({
            message: 'Sponsor registration successful. You can now login.',
        });

    } catch (error) {
        console.error('Error registering sponsor:', error);
        res.status(500).json({ error: 'Error registering sponsor' });
    }
};

/**
 * Sponsor Login
 */
exports.loginSponsor = async (req, res) => {
    try {
        const { email, password } = req.body;
        const sponsor = await SponsorModel.getSponsorByEmail(email);

        if (!sponsor) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (sponsor.is_blocked) {
            return res.status(403).json({ error: 'Your account has been blocked.' });
        }

        const validPassword = await bcrypt.compare(password, sponsor.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: sponsor.id, email: sponsor.email, isSponsor: true },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            sponsor: {
                id: sponsor.id,
                fullName: sponsor.full_name,
                email: sponsor.email,
                role: 'sponsor'
            },
            message: 'Login successful'
        });

    } catch (error) {
        console.error('Error during sponsor login:', error);
        res.status(500).json({ error: 'Error during login' });
    }
};

/**
 * Add Sponsor Vehicle (Bike/Car/Scooter)
 */
exports.addVehicle = async (req, res) => {
    try {
        const userId = req.user.id; // Sponsor ID from middleware
        const { type } = req.params; // 'bikes', 'cars', 'scooty'

        let tableName = type;
        if (type === 'bike') tableName = 'bikes';
        if (type === 'car') tableName = 'cars';
        if (type === 'scooty') tableName = 'scooty';

        // Form Data
        const { name, registrationNumber, model, year, pricePerHour, engine, fuelType, description } = req.body;

        // Files from multer
        const imageFile = req.files['image'] ? req.files['image'][0] : null;
        const rcFile = req.files['rc'] ? req.files['rc'][0] : null;
        const insuranceFile = req.files['insurance'] ? req.files['insurance'][0] : null;
        const pucFile = req.files['puc'] ? req.files['puc'][0] : null;

        if (!name || !pricePerHour || !tableName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Ensure image is uploaded
        if (!imageFile) {
            return res.status(400).json({ error: 'Vehicle image is required' });
        }

        // Upload files
        const uploadPromises = [
            uploadToSupabase(imageFile, SUPABASE_BUCKET, 'vehicles'),
            rcFile ? uploadToSupabase(rcFile, SUPABASE_BUCKET, 'documents') : null,
            insuranceFile ? uploadToSupabase(insuranceFile, SUPABASE_BUCKET, 'documents') : null,
            pucFile ? uploadToSupabase(pucFile, SUPABASE_BUCKET, 'documents') : null
        ];

        const [imageUrl, rcUrl, insuranceUrl, pucUrl] = await Promise.all(uploadPromises);

        // Prepare vehicle data
        const vehicleData = {
            name,
            registration_number: registrationNumber, // Maps to bikeNumber logic
            model,
            year: parseInt(year) || new Date().getFullYear(),
            price: parseFloat(pricePerHour), // 'price' in current DB, 'price_per_hour' in sponsor DB. Using 'price' to match RentHub schema.
            image_url: imageUrl,             // 'image_url' in RentHub, 'image' in Sponsor. Using 'image_url'.
            rc_url: rcUrl,
            insurance_url: insuranceUrl,
            puc_url: pucUrl,
            sponsor_id: userId,
            is_available: false, // Hidden until approved
            is_approved: false,  // Pending
            type: type, // 'car', 'bike', 'scooty'
            engine: engine || '',
            fuel_type: fuelType || '',
            description: description || ''
        };

        const newVehicle = await SponsorModel.addSponsorVehicle(vehicleData);

        res.status(201).json({
            message: 'Vehicle submitted for approval',
            vehicle: newVehicle
        });

    } catch (error) {
        console.error('Error adding vehicle:', error);
        res.status(500).json({ error: 'Failed to add vehicle' });
    }
};

/**
 * Get My Vehicles
 */
exports.getMyVehicles = async (req, res) => {
    try {
        const userId = req.user.id;
        const vehicles = await SponsorModel.getSponsorVehicles(userId);
        res.json({ vehicles });
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        res.status(500).json({ error: 'Failed to fetch vehicles' });
    }
};
