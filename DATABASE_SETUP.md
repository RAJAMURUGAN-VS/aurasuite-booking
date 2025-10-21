# AuraSuite - Complete Database Setup

## Run this SQL in your Supabase SQL Editor

```sql
-- Enable necessary extensions
create extension if not exists pgcrypto;

-- Barbers table (max 6 barbers)
create table barbers (
  id text primary key,
  name text not null,
  email text unique not null,
  password_hash text not null,
  experience_years integer not null default 0,
  rating numeric default 0,
  photo text,
  reviews jsonb default '[]'::jsonb,
  services text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seats table (6 seats total)
create table seats (
  id text primary key,
  label text not null,
  state text not null default 'available',
  expires_at timestamptz,
  barber_id text not null,
  paused boolean default false,
  created_at timestamptz default now()
);

-- Appointments table
create table appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete cascade,
  customer_name text,
  barber_id text not null,
  seat_id text not null,
  date_time timestamptz not null,
  services text[] not null,
  status text default 'pending',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Current state for each barber
create table current_state (
  id text primary key,
  barber_id text not null,
  customer_name text,
  customer_id uuid references auth.users(id),
  approx_time_minutes int default 15,
  seat_id text,
  paused boolean default false,
  updated_at timestamptz default now()
);

-- Real-time subscriptions
alter table appointments replica identity full;
alter table current_state replica identity full;
alter table seats replica identity full;

-- Enable RLS
alter table barbers enable row level security;
alter table seats enable row level security;
alter table appointments enable row level security;
alter table current_state enable row level security;

-- RLS Policies
create policy "Anyone can view barbers" on barbers for select using (true);
create policy "Admins can manage barbers" on barbers for all using (
  exists (
    select 1 from auth.users 
    where auth.users.id = auth.uid() 
    and auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

create policy "Anyone can view seats" on seats for select using (true);
create policy "Admins can manage seats" on seats for all using (
  exists (
    select 1 from auth.users 
    where auth.users.id = auth.uid() 
    and auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

create policy "Users can view own appointments" on appointments for select using (auth.uid() = customer_id);
create policy "Users can create appointments" on appointments for insert with check (auth.uid() = customer_id);
create policy "Admins can manage appointments" on appointments for all using (
  exists (
    select 1 from auth.users 
    where auth.users.id = auth.uid() 
    and auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

create policy "Anyone can view current state" on current_state for select using (true);
create policy "Admins can manage current state" on current_state for all using (
  exists (
    select 1 from auth.users 
    where auth.users.id = auth.uid() 
    and auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Functions
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_barbers_updated_at before update on barbers for each row execute procedure update_updated_at_column();
create trigger update_appointments_updated_at before update on appointments for each row execute procedure update_updated_at_column();
create trigger update_current_state_updated_at before update on current_state for each row execute procedure update_updated_at_column();

-- Create initial seats (will be assigned to barbers when they're added)
insert into seats (id, label, state, barber_id) values
('S1', 'Seat 1', 'available', 'B1'),
('S2', 'Seat 2', 'available', 'B2'),
('S3', 'Seat 3', 'available', 'B3'),
('S4', 'Seat 4', 'available', 'B4'),
('S5', 'Seat 5', 'available', 'B5'),
('S6', 'Seat 6', 'available', 'B6');
```

## Create Admin User

After running the SQL above, create the admin user manually:

1. Go to **Authentication** → **Users** in your Supabase dashboard
2. Click **"Add user"**
3. Enter:
   - **Email**: `admin@aurasuite.com`
   - **Password**: `AdminPass123`
   - **Email Confirm**: ✅ (check this)
4. Click **"Create user"**
5. Click on the created user to edit
6. In **"Raw user meta data"**, add:
   ```json
   {
     "role": "admin",
     "name": "Admin User"
   }
   ```
7. Click **"Save"**

## Next Steps
1. Run the SQL above in your Supabase SQL Editor
2. Create the admin user as described above
3. Start your app: `npm run dev`
4. Go to `/login` and test admin login
5. Start adding barbers in the admin dashboard!
