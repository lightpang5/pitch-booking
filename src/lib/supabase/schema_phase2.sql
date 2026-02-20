-- PHASE 2: Collaborative Booking Schema

-- 1. Booking Participants Table
create table public.booking_participants (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references public.bookings(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'attendee' check (role in ('organizer', 'attendee')),
  status text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(booking_id, user_id)
);

-- 2. Notifications Table
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  type text check (type in ('invite', 'update', 'system')),
  is_read boolean default false,
  link text, -- e.g., '/bookings/123'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable RLS
alter table public.booking_participants enable row level security;
alter table public.notifications enable row level security;

-- 4. RLS Policies

-- Notifications: Simple, user sees own
create policy "Users can view own notifications." on public.notifications for select using (auth.uid() = user_id);
create policy "System can insert notifications." on public.notifications for insert with check (true); -- broader for triggers/actions
create policy "Users can update own notifications." on public.notifications for update using (auth.uid() = user_id);

-- Booking Participants:
-- View: If you are in the booking (or maybe public if we want open invites? let's stick to participants or organizer)
-- Actually, for MVP, let's allow authenticated users to view participants if they have the booking ID (shared link scenario).
create policy "Participants viewable by authenticated." on public.booking_participants for select using (auth.role() = 'authenticated');

-- Insert: Users can add themselves (join) or add others (invite) if they are already part of it?
-- For MVP, let's allow:
-- 1. Organizer adding initial participant (themselves) -> Handled by Logic
-- 2. Participants adding others.
create policy "Participants can add others." on public.booking_participants for insert with check (
  auth.role() = 'authenticated'
);

-- Update: User can update their own status (Accept/Decline)
create policy "Users update own status." on public.booking_participants for update using (auth.uid() = user_id);

-- 5. UPDATE Bookings RLS (Crucial for Collaboration)
-- Allow update if user is a participant of that booking
create policy "Participants can update booking details." on public.bookings for update using (
  exists (
    select 1 from public.booking_participants bp
    where bp.booking_id = id
    and bp.user_id = auth.uid()
    and bp.status = 'accepted' -- Only accepted participants can edit
  )
);

-- 6. Helper Function: Get Recent Contacts
-- Returns users that the current user has shared a booking with recently.
create or replace function get_recent_contacts()
returns table (user_id uuid, full_name text, email text, last_met timestamp with time zone) 
language sql security definer
as $$
  select distinct 
    p.id as user_id,
    p.full_name,
    p.email,
    max(b.start_time) as last_met
  from booking_participants bp1
  join booking_participants bp2 on bp1.booking_id = bp2.booking_id
  join bookings b on bp1.booking_id = b.id
  join profiles p on bp2.user_id = p.id
  where bp1.user_id = auth.uid() -- My bookings
  and bp2.user_id != auth.uid() -- The other person
  group by p.id, p.full_name, p.email
  order by last_met desc
  limit 10;
$$;
