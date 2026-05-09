const supabase = require('../config/supabase');

const uploadToSupabase = async (file, bucket, folder) => {
    try {
        const fileName = `${folder}/${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (error) {
        console.error('Upload Error:', error);
        throw new Error('Failed to upload file');
    }
};

module.exports = { uploadToSupabase };
