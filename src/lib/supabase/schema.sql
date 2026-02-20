-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PITCHES
create table public.pitches (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  location text not null,
  price_per_hour integer not null, -- integer for simpler math (e.g. cents or whole currency units)
  images text[], -- array of image URLs
  amenities text[], -- e.g. ['Lighting', 'Parking']
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- BOOKINGS
create table public.bookings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  pitch_id uuid references public.pitches(id) on delete cascade not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  total_price integer not null,
  status text default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES
alter table public.profiles enable row level security;
alter table public.pitches enable row level security;
alter table public.bookings enable row level security;

-- Profiles: Public read, User update own
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);

-- Pitches: Public read, Admin write (mocking admin check for all authenticated for MVP debug easily, or just strict)
-- For MVP simple: Allow read to everyone. Allow insert/update only to auth users (or specific admins)
create policy "Pitches are viewable by everyone." on public.pitches for select using (true);
create policy "Pitches can be created by authenticated users." on public.pitches for insert with check (auth.role() = 'authenticated'); 

-- Bookings: User view own, User create own
create policy "Users can view own bookings." on public.bookings for select using (auth.uid() = user_id);
create policy "Users can create bookings." on public.bookings for insert with check (auth.uid() = user_id);

-- TRIGGER for New User -> Profile
-- This trigger automatically creates a profile entry when a new user signs up via Supabase Auth.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
