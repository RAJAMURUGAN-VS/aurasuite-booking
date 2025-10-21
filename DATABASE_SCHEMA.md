# Updated Supabase Schema for Barber-Specific Appointments

## SQL Schema (Run in Supabase SQL Editor)

```sql
-- Enable necessary extensions
create extension if not exists pgcrypto;

-- Users table (extends auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  role text default 'customer',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Barbers table with unique credentials
create table if not exists barbers (
  id text primary key,
  name text not null,
  email text unique not null,
  password_hash text not null,
  rating numeric default 4.5,
  photo text,
  reviews jsonb default '[]'::jsonb,
  services text[] default '{}',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Seats table
create table if not exists seats (
  id text primary key,
  label text not null,
  state text not null default 'available',
  expires_at timestamptz,
  barber_id text not null references barbers(id),
  paused boolean default false,
  created_at timestamptz default now()
);

-- Appointments table with customer and barber references
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete cascade,
  customer_name text,
  barber_id text not null references barbers(id),
  seat_id text not null references seats(id),
  date_time timestamptz not null,
  services text[] not null,
  status text default 'pending',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Current state for each barber
create table if not exists current_state (
  id text primary key,
  barber_id text not null references barbers(id),
  customer_name text,
  customer_id uuid references auth.users(id),
  approx_time_minutes int default 15,
  seat_id text references seats(id),
  paused boolean default false,
  updated_at timestamptz default now()
);

-- Real-time subscriptions
alter table appointments replica identity full;
alter table current_state replica identity full;
alter table seats replica identity full;

-- RLS Policies
alter table profiles enable row level security;
alter table barbers enable row level security;
alter table seats enable row level security;
alter table appointments enable row level security;
alter table current_state enable row level security;

-- Profiles policies
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Barbers policies
create policy "Anyone can view active barbers" on barbers for select using (is_active = true);
create policy "Barbers can update own info" on barbers for update using (email = auth.jwt() ->> 'email');

-- Seats policies
create policy "Anyone can view seats" on seats for select using (true);
create policy "Barbers can update their seats" on seats for update using (barber_id in (select id from barbers where email = auth.jwt() ->> 'email'));

-- Appointments policies
create policy "Users can view own appointments" on appointments for select using (auth.uid() = customer_id);
create policy "Barbers can view their appointments" on appointments for select using (barber_id in (select id from barbers where email = auth.jwt() ->> 'email'));
create policy "Users can create appointments" on appointments for insert with check (auth.uid() = customer_id);
create policy "Barbers can update their appointments" on appointments for update using (barber_id in (select id from barbers where email = auth.jwt() ->> 'email'));

-- Current state policies
create policy "Anyone can view current state" on current_state for select using (true);
create policy "Barbers can update their current state" on current_state for all using (barber_id in (select id from barbers where email = auth.jwt() ->> 'email'));

-- Functions
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name, email, role)
  values (new.id, new.raw_user_meta_data->>'name', new.email, coalesce(new.raw_user_meta_data->>'role', 'customer'));
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Update timestamp function
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_profiles_updated_at before update on profiles for each row execute procedure update_updated_at_column();
create trigger update_appointments_updated_at before update on appointments for each row execute procedure update_updated_at_column();
create trigger update_current_state_updated_at before update on current_state for each row execute procedure update_updated_at_column();
```

## Seed Data

```sql
-- Insert barbers with unique credentials
insert into barbers (id, name, email, password_hash, rating, photo, reviews, services) values
('B1', 'Marco Silva', 'marco@elitecuts.com', crypt('barber123', gen_salt('bf')), 4.8, 'https://via.placeholder.com/100/4A5568/ffffff?text=MS', 
'[{"user":"Alex Johnson","text":"Fantastic cut! Very professional and friendly. Marco really knows his craft."},{"user":"Nia Patel","text":"Best barber in town. Always delivers! I''ve been coming here for years."},{"user":"David Kim","text":"Excellent service and great conversation. Highly recommended!"},{"user":"Rachel Green","text":"Marco is amazing! He gave me exactly what I wanted."},{"user":"Tom Anderson","text":"Professional, skilled, and friendly. Worth every penny!"},{"user":"Sarah Williams","text":"Best haircut I''ve ever had. Will definitely be back!"}]',
array['Haircut','Beard Trim','Styling'])
on conflict (id) do nothing;

insert into barbers (id, name, email, password_hash, rating, photo, reviews, services) values
('B2', 'Priya Kapoor', 'priya@elitecuts.com', crypt('barber123', gen_salt('bf')), 4.6, 'https://via.placeholder.com/100/EC4899/ffffff?text=PK',
'[{"user":"Sam Wilson","text":"Great style and attention to detail. Priya is a true artist!"},{"user":"Emma Davis","text":"Very skilled, highly recommend! She knows exactly what suits you."},{"user":"Chris Martinez","text":"Priya transformed my look completely. Love it!"},{"user":"Jessica Lee","text":"Professional and personable. Great experience overall."},{"user":"Ryan Cooper","text":"Best grooming service in the area. Five stars!"}]',
array['Haircut','Grooming','Coloring'])
on conflict (id) do nothing;

insert into barbers (id, name, email, password_hash, rating, photo, reviews, services) values
('B3', 'James Chen', 'james@elitecuts.com', crypt('barber123', gen_salt('bf')), 4.9, 'https://via.placeholder.com/100/8B5CF6/ffffff?text=JC',
'[{"user":"Mike Brown","text":"Amazing experience every time! James is the best in the business."},{"user":"Lisa Garcia","text":"Professional and efficient service. Never disappoints!"},{"user":"Kevin Park","text":"James has magic hands! My hair has never looked better."},{"user":"Amanda Scott","text":"Incredible attention to detail. Worth the wait!"},{"user":"Brian Taylor","text":"Top-notch service and skills. Highly recommended!"},{"user":"Nicole Chen","text":"James is fantastic! Always leaves feeling great."}]',
array['Haircut','Shaving','Kids Cut','Beard Trim'])
on conflict (id) do nothing;

-- Insert seats
insert into seats (id, label, state, expires_at, barber_id) values
('S1', 'Seat 1', 'available', null, 'B1'),
('S2', 'Seat 2', 'booked', now() + interval '2 minutes', 'B2'),
('S3', 'Seat 3', 'available', null, 'B3'),
('S4', 'Seat 4', 'booked', now() + interval '5 minutes', 'B1'),
('S5', 'Seat 5', 'available', null, 'B2'),
('S6', 'Seat 6', 'available', null, 'B3')
on conflict (id) do nothing;

-- Insert current state for each barber
insert into current_state (id, barber_id, customer_name, approx_time_minutes, seat_id, paused) values
('B1', 'B1', null, 15, null, false),
('B2', 'B2', null, 15, null, false),
('B3', 'B3', null, 15, null, false)
on conflict (id) do nothing;

-- Create admin user
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated', 
  'admin@elitecuts.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
) on conflict (email) do nothing;

-- Add admin role metadata
insert into auth.user_metadata (user_id, raw_user_meta_data)
select id, '{"role": "admin", "name": "Admin User"}'::jsonb
from auth.users 
where email = 'admin@elitecuts.com'
on conflict (user_id) do nothing;
```

## Barber Login Credentials

- **Marco Silva**: marco@elitecuts.com / barber123
- **Priya Kapoor**: priya@elitecuts.com / barber123  
- **James Chen**: james@elitecuts.com / barber123
- **Admin**: admin@elitecuts.com / admin123

## Key Features

1. **User Authentication**: Sign up/sign in with email verification
2. **Barber-Specific Appointments**: Each barber only sees their own appointments
3. **Real-time Updates**: Changes reflect immediately across all connected clients
4. **User Portal**: Customers can view their booking status
5. **Admin Controls**: Timer settings and appointment management per barber
6. **Row Level Security**: Data isolation between barbers and customers
