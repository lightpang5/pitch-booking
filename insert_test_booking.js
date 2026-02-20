const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
let supabaseUrl = '';
let supabaseKey = '';

try {
    const content = fs.readFileSync('.env.local', 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
            supabaseUrl = line.split('=')[1].trim();
        }
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
            supabaseKey = line.split('=')[1].trim();
        }
    }
} catch (e) {
    console.error("Could not read .env.local");
    process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase credentials not found");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertTestBooking() {
    const userId = "ee4be24c-fc2f-412e-a129-566408462925";

    // 1. Get a pitch
    const { data: pitches } = await supabase.from('pitches').select('id').limit(1);

    if (!pitches || pitches.length === 0) {
        console.error("No pitches found.");
        return;
    }

    const pitchId = pitches[0].id;

    // 2. Insert booking
    const { data, error } = await supabase
        .from('bookings')
        .insert({
            user_id: userId,
            pitch_id: pitchId,
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 3600000).toISOString(), // +1 hour
            status: 'confirmed'
        })
        .select();

    if (error) {
        console.error("Error inserting booking:", error);
    } else {
        console.log("Inserted test booking:", data);
    }
}

insertTestBooking();
