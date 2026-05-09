const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Helper function: Generate PDF invoice and return as buffer
const generateInvoiceBuffer = async (bookingId, userName, userEmail, vehicleName, duration, startDateTime, totalAmount, advancePayment, terms = 'Standard RentHub terms apply.') => {
    try {
        // Generate QR payload
        const qrPayload = { bookingId, userName, vehicleName, pickupDateTime: startDateTime, totalAmount };
        const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload));
        const qrBase64 = qrDataUrl.split(',')[1];
        const qrBuffer = Buffer.from(qrBase64, 'base64');

        // Create PDF in memory
        const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: `Invoice ${bookingId}`, Author: 'RentHub' } });
        let buffers = [];
        doc.on('data', (chunk) => buffers.push(chunk));

        // Try to find a logo file (prefer png/jpg)
        // Assuming we are in backend/utils/, so go up to backend (..) then up to RentHubR (..) then frontend/public/photo
        const photoDir = path.join(__dirname, '../../frontend/public', 'photo');
        const logoCandidates = ['logo.png', 'logo.jpg', 'logo.jpeg', 'KD.jpg', 'JSP.jpg'];
        let logoPath = null;
        for (const name of logoCandidates) {
            const p = path.join(photoDir, name);
            if (fs.existsSync(p)) { logoPath = p; break; }
        }

        const margin = 40;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const contentWidth = pageWidth - (2 * margin);

        // ===== HEADER =====
        doc.fillColor('#1e3a5f').rect(0, 0, pageWidth, 70).fill();

        // Logo or placeholder
        if (logoPath) {
            try {
                doc.image(logoPath, margin, 8, { width: 50, height: 50 });
            } catch (err) {
                doc.fillColor('#00d084').rect(margin, 8, 50, 50).fill();
            }
        } else {
            doc.fillColor('#00d084').rect(margin, 8, 50, 50).fill();
        }

        // Header text
        doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('RentHub', margin + 60, 12);
        doc.fillColor('#00d084').fontSize(12).font('Helvetica').text('BOOKING INVOICE', margin + 60, 42);

        doc.y = 80;

        // ===== CUSTOMER & INVOICE DETAILS =====
        doc.fillColor('#1f2937').fontSize(11).font('Helvetica-Bold').text('CUSTOMER & BOOKING DETAILS', margin);
        doc.moveDown(0.3);

        // Gray background box for details
        const detailsY = doc.y;
        doc.fillColor('#f3f4f6').rect(margin, detailsY, contentWidth, 70).fill();
        doc.strokeColor('#e5e7eb').lineWidth(1).rect(margin, detailsY, contentWidth, 70).stroke();

        // Left column
        doc.fillColor('#6b7280').fontSize(9).font('Helvetica-Bold').text('Customer Name:', margin + 12, detailsY + 8);
        doc.fillColor('#000').fontSize(10).font('Helvetica').text(userName || 'N/A', margin + 12);

        doc.fillColor('#6b7280').fontSize(9).font('Helvetica-Bold').text('Email:', margin + 12);
        doc.fillColor('#000').fontSize(9).font('Helvetica').text(userEmail || 'N/A', margin + 12);

        // Right column
        const rightColX = margin + (contentWidth / 2);
        doc.fillColor('#6b7280').fontSize(9).font('Helvetica-Bold').text('Booking ID:', rightColX, detailsY + 8);
        doc.fillColor('#000').fontSize(10).font('Helvetica').text(bookingId || 'N/A', rightColX);

        doc.fillColor('#6b7280').fontSize(9).font('Helvetica-Bold').text('Vehicle:', rightColX);
        doc.fillColor('#000').fontSize(9).font('Helvetica').text(vehicleName || 'N/A', rightColX);

        doc.y = detailsY + 75;

        // ===== BOOKING DETAILS =====
        doc.fillColor('#1f2937').fontSize(11).font('Helvetica-Bold').text('RENTAL DETAILS', margin);
        doc.moveDown(0.3);

        const bookingDetailsY = doc.y;
        doc.fillColor('#f3f4f6').rect(margin, bookingDetailsY, contentWidth, 50).fill();
        doc.strokeColor('#e5e7eb').lineWidth(1).rect(margin, bookingDetailsY, contentWidth, 50).stroke();

        doc.fillColor('#6b7280').fontSize(9).font('Helvetica-Bold').text('Start Date & Time:', margin + 12, bookingDetailsY + 8);
        doc.fillColor('#000').fontSize(9).font('Helvetica').text(startDateTime || 'N/A', margin + 12);

        doc.fillColor('#6b7280').fontSize(9).font('Helvetica-Bold').text('Duration:', rightColX, bookingDetailsY + 8);
        doc.fillColor('#000').fontSize(9).font('Helvetica').text(`${duration} hours`, rightColX);

        doc.y = bookingDetailsY + 55;

        // ===== AMOUNT BREAKDOWN =====
        doc.fillColor('#1f2937').fontSize(11).font('Helvetica-Bold').text('AMOUNT BREAKDOWN', margin);
        doc.moveDown(0.2);

        const amountY = doc.y;
        doc.fillColor('#f3f4f6').rect(margin, amountY, contentWidth - 80, 75).fill();
        doc.strokeColor('#e5e7eb').lineWidth(1).rect(margin, amountY, contentWidth - 80, 75).stroke();

        const labelX = margin + 12;
        const valueX = margin + contentWidth - 120;
        let lineY = amountY + 10;

        // Total
        doc.fillColor('#374151').fontSize(10).font('Helvetica').text('Total Amount:', labelX, lineY);
        doc.fillColor('#1f2937').fontSize(10).font('Helvetica-Bold').text(`₹${totalAmount.toFixed(2)}`, valueX, lineY);

        lineY += 18;

        // Advance
        doc.fillColor('#374151').fontSize(10).font('Helvetica').text('Advance Paid:', labelX, lineY);
        doc.fillColor('#00a86b').fontSize(10).font('Helvetica-Bold').text(`₹${(advancePayment || 0).toFixed(2)}`, valueX, lineY);

        lineY += 18;

        // Remaining
        const remaining = (totalAmount || 0) - (advancePayment || 0);
        doc.fillColor('#374151').fontSize(10).font('Helvetica').text('Remaining:', labelX, lineY);
        doc.fillColor('#ff6b35').fontSize(10).font('Helvetica-Bold').text(`₹${remaining.toFixed(2)}`, valueX, lineY);

        // QR Code - Right side of amount box
        try {
            const qrSize = 75;
            const qrX = margin + contentWidth - 75;
            const qrY = amountY + 5;
            doc.image(qrBuffer, qrX, qrY, { width: qrSize });
        } catch (err) {
            console.warn('QR image error:', err.message);
        }

        doc.y = amountY + 80;

        // ===== TERMS & CONDITIONS (Compact) =====
        doc.fillColor('#1f2937').fontSize(10).font('Helvetica-Bold').text('TERMS & CONDITIONS', margin);
        doc.moveDown(0.15);

        const termsSections = [
            {
                title: '1. Booking Confirmation', color: '#3b82f6', bgColor: '#eff6ff', titleColor: '#1e40af', items: [
                    'Advance booking confirmed after payment. Confirmation email will be sent.'
                ]
            },
            {
                title: '2. Advance Payment', color: '#10b981', bgColor: '#ecfdf5', titleColor: '#047857', items: [
                    'Minimum ₹100/- advance required. Remaining paid at pickup.'
                ]
            },
            {
                title: '3. Cancellation Policy', color: '#f59e0b', bgColor: '#fffbeb', titleColor: '#92400e', items: [
                    '2+ hrs before: Full refund. Within 2 hrs: 50% deducted.'
                ]
            },
            {
                title: '4. Required Documents', color: '#06b6d4', bgColor: '#ecfdf5', titleColor: '#0e7490', items: [
                    'Valid Aadhar Card required at pickup. Booking cancelled without valid documents.'
                ]
            },
            {
                title: '5. Bike Usage', color: '#ef4444', bgColor: '#fef2f2', titleColor: '#b91c1c', items: [
                    'Only registered renter can use. Sub-renting strictly prohibited.'
                ]
            },
            {
                title: '6. Late Return', color: '#f97316', bgColor: '#fff7ed', titleColor: '#c2410c', items: [
                    'Late return charges apply per hour beyond scheduled time.'
                ]
            },
            {
                title: '7. Refund Policy', color: '#10b981', bgColor: '#ecfdf5', titleColor: '#047857', items: [
                    'Refunds processed within 3-5 working days after cancellation.'
                ]
            },
            {
                title: '8. Company Rights', color: '#6b7280', bgColor: '#f9fafb', titleColor: '#374151', items: [
                    'Company may cancel due to unforeseen issues. Full refund provided.'
                ]
            }
        ];

        let termsY = doc.y;
        for (const section of termsSections) {
            const sectionHeight = 24 + (section.items.length * 8);

            // Background
            doc.fillColor(section.bgColor).rect(margin, termsY, contentWidth, sectionHeight).fill();
            doc.strokeColor(section.color).lineWidth(1).rect(margin, termsY, contentWidth, sectionHeight).stroke();

            // Title
            doc.fillColor(section.titleColor).fontSize(7).font('Helvetica-Bold').text(section.title, margin + 6, termsY + 4);

            // Items
            let itemY = termsY + 15;
            doc.fillColor('#374151').fontSize(6).font('Helvetica');
            for (const item of section.items) {
                doc.text('• ' + item, margin + 10, itemY, { width: contentWidth - 18 });
                itemY += 7;
            }

            termsY = itemY + 3;
        }

        doc.y = termsY;

        // ===== FOOTER =====
        const footerY = pageHeight - 40;
        doc.fillColor('#f3f4f6').rect(0, footerY, pageWidth, 40).fill();
        doc.fillColor('#6b7280').fontSize(8).font('Helvetica').text('RentHub — Premium Bike & Scooty Rentals | renthub.otp@gmail.com | +91 9040757683 | www.renthub.in', margin, footerY + 5, { width: contentWidth });
        doc.fillColor('#9ca3af').fontSize(7).text('© 2024 RentHub. All rights reserved.', margin, footerY + 22);

        doc.end();

        return new Promise((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
        });
    } catch (err) {
        console.error('Error generating invoice buffer:', err);
        throw err;
    }
};

module.exports = { generateInvoiceBuffer };
