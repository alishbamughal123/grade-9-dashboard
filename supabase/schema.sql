-- ============================================================
-- Grade 9 Marks Dashboard - Supabase schema
-- Supabase > SQL Editor > New query > paste all > Run
-- ============================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  role text not null default 'teacher' check (role in ('admin','teacher')),
  created_at timestamptz default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  roll_no text not null unique,
  name text not null,
  section text default 'A',
  created_at timestamptz default now()
);

-- "Books" = subjects (Physics, Chemistry, Maths ...)
create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- which teacher teaches which book
create table if not exists teacher_subjects (
  teacher_id uuid references profiles(id) on delete cascade,
  subject_id uuid references subjects(id) on delete cascade,
  primary key (teacher_id, subject_id)
);

create table if not exists tests (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  test_date date not null default current_date,
  total_marks numeric not null check (total_marks > 0),
  created_by uuid not null default auth.uid() references profiles(id),
  created_at timestamptz default now()
);

create table if not exists marks (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references tests(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  obtained numeric,               -- null when absent
  absent boolean not null default false,
  created_by uuid not null default auth.uid() references profiles(id),
  updated_at timestamptz default now(),
  unique (test_id, student_id)
);

create index if not exists marks_test_idx on marks(test_id);
create index if not exists marks_student_idx on marks(student_id);
create index if not exists tests_subject_idx on tests(subject_id);

-- auto-create profile when a user is created in Authentication
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create or replace function is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ============ Row Level Security ============
alter table profiles enable row level security;
alter table students enable row level security;
alter table subjects enable row level security;
alter table teacher_subjects enable row level security;
alter table tests enable row level security;
alter table marks enable row level security;

-- everyone logged in can VIEW everything
create policy "read profiles" on profiles for select to authenticated using (true);
create policy "read students" on students for select to authenticated using (true);
create policy "read subjects" on subjects for select to authenticated using (true);
create policy "read assignments" on teacher_subjects for select to authenticated using (true);
create policy "read tests" on tests for select to authenticated using (true);
create policy "read marks" on marks for select to authenticated using (true);

-- only ADMIN manages profiles(role), students, subjects, assignments
create policy "admin update profiles" on profiles for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin students" on students for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin subjects" on subjects for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin assignments" on teacher_subjects for all to authenticated using (is_admin()) with check (is_admin());

-- tests: teacher can create only for an assigned book; edit/delete only own
create policy "create test" on tests for insert to authenticated with check (
  created_by = auth.uid() and (
    is_admin() or exists (select 1 from teacher_subjects ts where ts.teacher_id = auth.uid() and ts.subject_id = tests.subject_id)
  )
);
create policy "edit own test" on tests for update to authenticated
  using (created_by = auth.uid() or is_admin()) with check (created_by = auth.uid() or is_admin());
create policy "delete own test" on tests for delete to authenticated
  using (created_by = auth.uid() or is_admin());

-- marks: only the owner of the test (or admin) can add/edit/delete
create policy "insert own marks" on marks for insert to authenticated with check (
  exists (select 1 from tests t where t.id = marks.test_id and (t.created_by = auth.uid() or is_admin()))
);
create policy "update own marks" on marks for update to authenticated
  using (exists (select 1 from tests t where t.id = marks.test_id and (t.created_by = auth.uid() or is_admin())))
  with check (exists (select 1 from tests t where t.id = marks.test_id and (t.created_by = auth.uid() or is_admin())));
create policy "delete own marks" on marks for delete to authenticated
  using (exists (select 1 from tests t where t.id = marks.test_id and (t.created_by = auth.uid() or is_admin())));

-- ============================================================
-- AFTER you create YOUR login (Authentication > Users > Add user),
-- run this once to make yourself admin:
--   update profiles set role = 'admin' where email = 'saleha.hamid@immigarments.com';
-- ============================================================
