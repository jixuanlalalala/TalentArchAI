-- Add immutable-at-application-level matching priorities to each job posting.
-- Run this migration in the Supabase SQL editor before deploying the updated
-- Flask application and analysis worker.

begin;

alter table public.job_postings
    add column if not exists hard_skill_weight smallint not null default 45,
    add column if not exists work_experience_weight smallint not null default 30,
    add column if not exists education_weight smallint not null default 15,
    add column if not exists soft_skill_weight smallint not null default 10;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.job_postings'::regclass
          and conname = 'job_postings_match_weights_range_check'
    ) then
        alter table public.job_postings
            add constraint job_postings_match_weights_range_check
            check (
                hard_skill_weight between 0 and 100
                and work_experience_weight between 0 and 100
                and education_weight between 0 and 100
                and soft_skill_weight between 0 and 100
            );
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.job_postings'::regclass
          and conname = 'job_postings_match_weights_total_check'
    ) then
        alter table public.job_postings
            add constraint job_postings_match_weights_total_check
            check (
                hard_skill_weight
                + work_experience_weight
                + education_weight
                + soft_skill_weight = 100
            );
    end if;
end
$$;

commit;
