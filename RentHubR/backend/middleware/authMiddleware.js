const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Prioritize .env secret

// Middleware to verify user token
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.log('VerifyToken: No auth header');
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        console.log('VerifyToken: No token in auth header');
        return res.status(401).json({ error: 'Invalid token format' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check user status in database with retry logic
        let user = null;
        let error = null;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const result = await supabase
                    .from('users')
                    .select('is_blocked, session_id')
                    .eq('id', decoded.id)
                    .single();
                
                user = result.data;
                error = result.error;
                
                if (!error) break; // Success
                
                // If it's a network error (fetch failed), retry
                if (error.message?.includes('fetch failed') || error.code === 'PGRST204') {
                    throw error;
                }
                break; // Other DB errors, don't retry
            } catch (err) {
                error = err;
                if (attempt < 3) {
                    console.warn(`VerifyToken: Attempt ${attempt} failed, retrying...`);
                    await new Promise(r => setTimeout(r, 1000 * attempt));
                }
            }
        }

        if (error || !user) {
            console.error('VerifyToken: User lookup failed after retries', error);
            return res.status(401).json({ error: 'User not found or connection failed' });
        }

        if (user.is_blocked) {
            console.log('VerifyToken: User is blocked');
            return res.status(403).json({ error: 'Account blocked', code: 'USER_BLOCKED' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        console.error('VerifyToken: Invalid token', error.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Admin middleware
const verifyAdminToken = async (req, res, next) => {
    console.log('verifyAdminToken called');
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('No token provided');
        return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Decoded token:', decoded);
        const { data: user, error } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', decoded.id)
            .single();
        console.log('User from DB:', user, 'Error:', error);
        if (error || !user || !user.is_admin) {
            console.log('Not authorized as admin');
            return res.status(403).json({ message: 'Not authorized as admin' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        console.log('Invalid token:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Optional Verification
const optionalVerifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Only verify against DB if we want strictly active users,
        // but for read-only optional context, token validity might be enough.
        // Let's verify DB anyway to be consistent.
        const { data: user } = await supabase.from('users').select('is_blocked').eq('id', decoded.id).single();

        if (user && !user.is_blocked) {
            req.user = decoded;
        }
        next();
    } catch {
        next();
    }
};


// Sponsor middleware
const verifySponsor = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check sponsor in database
        const { data: sponsor, error } = await supabase
            .from('sponsors')
            .select('is_blocked')
            .eq('id', decoded.id)
            .single();

        if (error || !sponsor) {
            return res.status(401).json({ error: 'Sponsor not found' });
        }

        if (sponsor.is_blocked) {
            return res.status(403).json({ error: 'Sponsor account blocked' });
        }

        req.user = decoded; // { id, email, isSponsor: true }
        next();
    } catch (error) {
        console.error('VerifySponsor: Invalid token', error.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = {
    verifyToken,
    verifyAdminToken,
    verifySponsor,
    optionalVerifyToken,
    JWT_SECRET
};
