const supabase = require('../config/supabase');

class SponsorModel {

    // ============================================
    // SPONSOR ACCOUNT OPERATIONS
    // ============================================

    static async createSponsorAccount(sponsorData) {
        const { data, error } = await supabase
            .from('sponsors')
            .insert([sponsorData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async getSponsorByEmail(email) {
        const { data, error } = await supabase
            .from('sponsors')
            .select('*')
            .eq('email', email)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    static async getSponsorById(id) {
        const { data, error } = await supabase
            .from('sponsors')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    static async updateSponsor(id, updateData) {
        const { data, error } = await supabase
            .from('sponsors')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // ============================================
    // VEHICLE REQUEST OPERATIONS
    // ============================================

    static async addSponsorVehicle(vehicleData) {
        // vehicleData contains { list of fields including type, sponsor_id ... }
        const { sponsor_id, type } = vehicleData;

        const { data, error } = await supabase
            .from('sponsor_vehicle_requests')
            .insert([{
                sponsor_id: sponsor_id,
                vehicle_type: type,
                vehicle_details: vehicleData,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async getSponsorVehicles(sponsorId) {
        // Fetch LIVE vehicles
        const [bikes, cars, scooty] = await Promise.all([
            supabase.from('bikes').select('*').eq('sponsor_id', sponsorId),
            supabase.from('cars').select('*').eq('sponsor_id', sponsorId),
            supabase.from('scooty').select('*').eq('sponsor_id', sponsorId)
        ]);

        // Fetch PENDING requests
        const { data: requests } = await supabase
            .from('sponsor_vehicle_requests')
            .select('*')
            .eq('sponsor_id', sponsorId)
            .eq('status', 'pending');

        const liveVehicles = [
            ...(bikes.data || []).map(v => ({ ...v, type: 'bike', status: 'Approved' })),
            ...(cars.data || []).map(v => ({ ...v, type: 'car', status: 'Approved' })),
            ...(scooty.data || []).map(v => ({ ...v, type: 'scooty', status: 'Approved' }))
        ];

        const pendingVehicles = (requests || []).map(r => ({
            ...r.vehicle_details,
            id: r.id, // Use request ID for tracking
            status: 'Pending Approval'
        }));

        return [...liveVehicles, ...pendingVehicles];
    }

    // ============================================
    // ADMIN OPERATIONS
    // ============================================

    static async getPendingVehicles() {
        const { data, error } = await supabase
            .from('sponsor_vehicle_requests')
            .select('*, sponsors(full_name, phone_number)')
            .eq('status', 'pending');

        if (error) throw error;

        // Map it to look like the vehicle object for Frontend consistency
        return data.map(r => ({
            id: r.id, // Request ID
            sponsor_id: r.sponsor_id,
            vehicleType: r.vehicle_type,
            ...r.vehicle_details, // Spread the details (name, price, etc)
            sponsors: r.sponsors
        }));
    }

    static async approveVehicle(requestId) {
        // 1. Get the request
        const { data: request, error: reqError } = await supabase
            .from('sponsor_vehicle_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (reqError) throw reqError;
        if (!request) throw new Error('Request not found');

        // 2. Prepare data for main table
        const vehicleData = {
            ...request.vehicle_details,
            is_approved: true,
            is_available: true
        };

        // Determine table
        let tableName;
        if (request.vehicle_type === 'bike') tableName = 'bikes';
        else if (request.vehicle_type === 'car') tableName = 'cars';
        else if (request.vehicle_type === 'scooty') tableName = 'scooty';
        else throw new Error('Invalid vehicle type');

        // 3. Insert into main table
        const { data: string, error: insertError } = await supabase
            .from(tableName)
            .insert([vehicleData])
            .select()
            .single();

        if (insertError) throw insertError;

        // 4. Update request status
        await supabase
            .from('sponsor_vehicle_requests')
            .update({ status: 'approved' })
            .eq('id', requestId);

        return request;
    }

    static async rejectVehicle(requestId) {
        const { error } = await supabase
            .from('sponsor_vehicle_requests')
            .update({ status: 'rejected' })
            .eq('id', requestId);

        if (error) throw error;
        return true;
    }
}

module.exports = SponsorModel;
