-- "Playing here" tags: who is at which course, when, and with whom.
-- A tag is readable by the poster's accepted friends and by anyone tagged on
-- it, and comes down on its own once ends_at has passed.

create table public.check_ins (
  id uuid primary key default uuid_generate_v4 (),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  -- Catalogue ids are strings; a user-added course is its courses.id.
  course_id text not null,
  course_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  note text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- Playing partners on a tag: app users when profile_id is set, otherwise a
-- free-text name.
create table public.check_in_partners (
  id uuid primary key default uuid_generate_v4 (),
  check_in_id uuid not null references public.check_ins (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  guest_name text,
  check (profile_id is not null or guest_name is not null)
);

create index check_ins_live_idx on public.check_ins (ends_at desc);
create index check_in_partners_tag_idx on public.check_in_partners (check_in_id);

alter table public.check_ins enable row level security;
alter table public.check_in_partners enable row level security;

create policy "players manage own check-ins" on public.check_ins
  for all using (auth.uid () = profile_id) with check (auth.uid () = profile_id);
create policy "friends and partners can view check-ins" on public.check_ins
  for select using (
    auth.uid () = profile_id
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid () and f.addressee_id = profile_id)
          or (f.addressee_id = auth.uid () and f.requester_id = profile_id))
    )
    or exists (
      select 1 from public.check_in_partners p
      where p.check_in_id = id and p.profile_id = auth.uid ()
    )
  );

create policy "check-in owner manages partners" on public.check_in_partners
  for all using (
    exists (select 1 from public.check_ins c where c.id = check_in_id and c.profile_id = auth.uid ())
  );
create policy "partners readable with the check-in" on public.check_in_partners
  for select using (
    exists (select 1 from public.check_ins c where c.id = check_in_id)
  );

-- Let the app subscribe to friends' tags as they're posted.
alter publication supabase_realtime add table public.check_ins;
