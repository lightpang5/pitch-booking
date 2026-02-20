const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rmvzysqjfxubmnadbepd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdnp5c3FqZnh1Ym1uYWRiZXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODE3NDAsImV4cCI6MjA4NTc1Nzc0MH0.ZrXXU4A1E3MY1va2CWL41CBVvF3uh5oN0gLjzx-3jZ8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBookings() {
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            *,
            pitches (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching bookings:', error);
        return;
    }

    console.log('Latest 5 Bookings in DB:');
    bookings.forEach(b => {
        console.log(`[${b.created_at}] ID: ${b.id.substring(0, 8)}... | Pitch: ${b.pitches?.name} | Start: ${b.start_time} | Total: ${b.total_price}`);
    });
}

checkBookings();
