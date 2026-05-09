/**
 * Normalize vehicle type to singular form
 * Ensures consistency across the entire application
 * 
 * @param {string} vehicleType - The vehicle type to normalize
 * @returns {string} - Normalized vehicle type ('bike', 'car', or 'scooty')
 */
function normalizeVehicleType(vehicleType) {
    if (!vehicleType) return null;

    const normalized = vehicleType.toLowerCase().trim();

    // Convert plural to singular
    switch (normalized) {
        case 'bikes':
            return 'bike';
        case 'cars':
            return 'car';
        case 'scooters':
        case 'scooties':
        case 'scooter':
            return 'scooty';
        case 'bike':
        case 'car':
        case 'scooty':
            return normalized;
        default:
            console.warn(`Unknown vehicle type: "${vehicleType}". Returning as-is.`);
            return normalized;
    }
}

/**
 * Validate vehicle type
 * @param {string} vehicleType - The vehicle type to validate
 * @returns {boolean} - True if valid
 */
function isValidVehicleType(vehicleType) {
    const valid = ['bike', 'car', 'scooty'];
    return valid.includes(normalizeVehicleType(vehicleType));
}

module.exports = {
    normalizeVehicleType,
    isValidVehicleType
};
