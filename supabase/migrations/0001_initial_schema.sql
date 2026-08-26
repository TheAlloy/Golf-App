-- Golf App initial schema.
-- The mobile MVP runs local-first; this schema is what the app syncs to once
-- a Supabase project is provisioned and EXPO_PUBLIC_SUPABASE_URL /
-- EXPO_PUBLIC_SUPABASE_ANON_KEY are set.

create extension if not exists "uuid-ossp";

-- One row per auth user, created by trigger on signup.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Golfer',
  handicap numeric(4, 1),
  home_city text,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default uuid_generate_v4 (),
  name text not null,
  city text,
  country text,
  latitude double precision not null,
  longitude double precision not null,
  par smallint not null default 72,
  holes smallint not null default 18,
  -- Estimated share (0-100) of golfers who have played the course; drives
  -- rarity points. Recomputed from real play counts once there is volume.
  popularity numeric(5, 2) not null default 5,
  created_by uuid references public.profiles (id),
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.friendships (
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table public.rounds (
  id uuid primary key default uuid_generate_v4 (),
  player_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id),
  played_on date not null,
  holes_played smallint not null default 18 check (holes_played in (9, 18)),
  gross_score smallint,
  to_par smallint,
  occasion text,
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Playing partners: app users when profile_id is set, otherwise a free-text
-- guest name for partners who aren't on the app yet.
create table public.round_partners (
  id uuid primary key default uuid_generate_v4 (),
  round_id uuid not null references public.rounds (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  guest_name text,
  check (profile_id is not null or guest_name is not null),
  unique (round_id, profile_id)
);

-- Photos live in the storage bucket 'round-photos'; this table holds paths.
create table public.round_photos (
  id uuid primary key default uuid_generate_v4 (),
  round_id uuid not null references public.rounds (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index rounds_player_idx on public.rounds (player_id, played_on desc);
create index rounds_course_idx on public.rounds (course_id);
create index courses_location_idx on public.courses (latitude, longitude);

-- Row level security -------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.friendships enable row level security;
alter table public.rounds enable row level security;
alter table public.round_partners enable row level security;
alter table public.round_photos enable row level security;

create policy "profiles are readable by everyone" on public.profiles
  for select using (true);
create policy "users manage own profile" on public.profiles
  for update using (auth.uid () = id);

create policy "courses are readable by everyone" on public.courses
  for select using (true);
create policy "signed-in users can add courses" on public.courses
  for insert with check (auth.uid () = created_by);

create policy "users see own friendships" on public.friendships
  for select using (auth.uid () in (requester_id, addressee_id));
create policy "users create friend requests" on public.friendships
  for insert with check (auth.uid () = requester_id);
create policy "addressee updates friendship status" on public.friendships
  for update using (auth.uid () = addressee_id);
create policy "either side removes friendship" on public.friendships
  for delete using (auth.uid () in (requester_id, addressee_id));

create policy "players manage own rounds" on public.rounds
  for all using (auth.uid () = player_id) with check (auth.uid () = player_id);
create policy "friends can view rounds" on public.rounds
  for select using (
    auth.uid () = player_id
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid () and f.addressee_id = player_id)
          or (f.addressee_id = auth.uid () and f.requester_id = player_id))
    )
  );

create policy "round owner manages partners" on public.round_partners
  for all using (
    exists (select 1 from public.rounds r where r.id = round_id and r.player_id = auth.uid ())
  );
create policy "round owner manages photos" on public.round_photos
  for all using (
    exists (select 1 from public.rounds r where r.id = round_id and r.player_id = auth.uid ())
  );

-- Auto-create a profile on signup.
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', 'Golfer'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user ();
