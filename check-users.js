const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rmvzysqjfxubmnadbepd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdnp5c3FqZnh1Ym1uYWRiZXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODE3NDAsImV4cCI6MjA4NTc1Nzc0MH0.ZrXXU4A1E3MY1va2CWL41CBVvF3uh5oN0gLjzx-3jZ8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    // Try to check public.profiles if it exists
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email')
        .limit(5);

    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    console.log('Available User Profiles:', profiles.length);
    profiles.forEach(p => console.log(`- ${p.email} (${p.id})`));
}

checkUsers();
