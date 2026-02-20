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

async function checkBookings() {
    const userId = "ee4be24c-fc2f-412e-a129-566408462925"; // The hardcoded ID used in route.ts

    console.log(`Checking bookings for user: ${userId}`);

    const { data, error } = await supabase
        .from('bookings')
        .select('*, pitches(*)')
        .eq('user_id', userId);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Found ${data.length} bookings.`);
        if (data.length > 0) {
            console.log(JSON.stringify(data[0], null, 2));
        } else {
            console.log("No bookings found. This explains why the UI might be empty (if fallback UI is missing).");
        }
    }
}

checkBookings();
