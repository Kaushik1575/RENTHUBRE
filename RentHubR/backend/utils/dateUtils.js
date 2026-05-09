// Helper function to get IST time in 'YYYY-MM-DD HH:mm:ss' format
function getISTTimestamp() {
    const now = new Date();
    // Convert to IST (UTC+5:30) using toLocaleString with Asia/Kolkata
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return istTime.getFullYear() + '-' +
        String(istTime.getMonth() + 1).padStart(2, '0') + '-' +
        String(istTime.getDate()).padStart(2, '0') + ' ' +
        String(istTime.getHours()).padStart(2, '0') + ':' +
        String(istTime.getMinutes()).padStart(2, '0') + ':' +
        String(istTime.getSeconds()).padStart(2, '0');
}

module.exports = {
    getISTTimestamp
};
