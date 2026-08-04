-- Sprint 1: data integrity and PostgreSQL-backed analysis queue foundation.
-- Apply only to the development Supabase project after reviewing the preflight
-- results. The transaction aborts without changes if duplicates or an unsafe
-- job foreign key are detected.

begin;

do $$
declare
    duplicate_relationship_count bigint;
begin
    select count(*)
    into duplicate_relationship_count
    from (
        select job_id, candidate_id
        from public.match_results
        group by job_id, candidate_id
        having count(*) > 1
    ) duplicates;

    if duplicate_relationship_count > 0 then
        raise exception
            'Migration stopped: % duplicate job-candidate relationship group(s) found.',
            duplicate_relationship_count;
    end if;
end
$$;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.match_results'::regclass
          and conname = 'match_results_job_id_fkey'
          and confrelid = 'public.job_postings'::regclass
          and contype = 'f'
    ) then
        raise exception
            'Migration stopped: expected match_results_job_id_fkey was not found.';
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.match_results'::regclass
          and conname = 'match_results_job_id_fkey'
          and confrelid = 'public.job_postings'::regclass
          and contype = 'f'
          and confdeltype = 'c'
    ) then
        alter table public.match_results
            drop constraint match_results_job_id_fkey;

        alter table public.match_results
            add constraint match_results_job_id_fkey
            foreign key (job_id)
            references public.job_postings(id)
            on delete cascade;
    end if;
end
$$;

do $$
declare
    job_id_attribute smallint;
    candidate_id_attribute smallint;
begin
    select attnum
    into job_id_attribute
    from pg_attribute
    where attrelid = 'public.match_results'::regclass
      and attname = 'job_id'
      and not attisdropped;

    select attnum
    into candidate_id_attribute
    from pg_attribute
    where attrelid = 'public.match_results'::regclass
      and attname = 'candidate_id'
      and not attisdropped;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.match_results'::regclass
          and contype = 'u'
          and cardinality(conkey) = 2
          and conkey @> array[job_id_attribute, candidate_id_attribute]::smallint[]
    ) then
        alter table public.match_results
            add constraint match_results_job_candidate_key
            unique (job_id, candidate_id);
    end if;
end
$$;

alter table public.match_results
    add column if not exists match_score numeric,
    add column if not exists recruitment_status text,
    add column if not exists processing_started_at timestamptz,
    add column if not exists analysis_error text;

update public.match_results
set recruitment_status = 'new'
where recruitment_status is null;

alter table public.match_results
    alter column status set default 'pending',
    alter column status set not null,
    alter column recruitment_status set default 'new',
    alter column recruitment_status set not null;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.match_results'::regclass
          and conname = 'match_results_analysis_status_check'
    ) then
        alter table public.match_results
            add constraint match_results_analysis_status_check
            check (status in ('pending', 'processing', 'completed', 'failed'));
    end if;

    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.match_results'::regclass
          and conname = 'match_results_recruitment_status_check'
    ) then
        alter table public.match_results
            add constraint match_results_recruitment_status_check
            check (
                recruitment_status in (
                    'new',
                    'under_review',
                    'shortlisted',
                    'rejected',
                    'archived'
                )
            );
    end if;

    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.match_results'::regclass
          and conname = 'match_results_scores_range_check'
    ) then
        alter table public.match_results
            add constraint match_results_scores_range_check
            check (
                (match_score is null or match_score between 0 and 100)
                and (education_score is null or education_score between 0 and 100)
                and (hard_skill_score is null or hard_skill_score between 0 and 100)
                and (soft_skill_score is null or soft_skill_score between 0 and 100)
                and (
                    work_experience_score is null
                    or work_experience_score between 0 and 100
                )
            );
    end if;
end
$$;

create index if not exists match_results_pending_queue_idx
    on public.match_results (created_at, id)
    where status = 'pending';

create or replace function public.claim_pending_match_result()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    claimed_match_result_id uuid;
begin
    update public.match_results
    set
        status = 'processing',
        processing_started_at = current_timestamp,
        analysis_error = null
    where id = (
        select id
        from public.match_results
        where status = 'pending'
        order by created_at asc nulls first, id asc
        for update skip locked
        limit 1
    )
    returning id into claimed_match_result_id;

    return claimed_match_result_id;
end;
$$;

revoke all on function public.claim_pending_match_result()
from public, anon, authenticated;
grant execute on function public.claim_pending_match_result()
to service_role;

create or replace function public.persist_candidate_resume_and_queue_matches(
    p_recruiter_id uuid,
    p_job_id uuid,
    p_name text,
    p_email text,
    p_phone text,
    p_location text,
    p_education text[],
    p_hard_skills text[],
    p_soft_skills text[],
    p_work_experience text[],
    p_resume_file_url text,
    p_raw_text text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    normalized_email text := nullif(lower(btrim(p_email)), '');
    normalized_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
    phone_candidate_ids uuid[];
    selected_candidate_id uuid;
    selected_match_result_id uuid;
    previous_resume_file_url text;
    candidate_created boolean := false;
    match_created boolean := false;
begin
    if not exists (
        select 1
        from public.job_postings
        where id = p_job_id
          and recruiter_id = p_recruiter_id
    ) then
        raise exception using
            errcode = '42501',
            message = 'Job ownership verification failed.';
    end if;

    if normalized_email is not null then
        select id
        into selected_candidate_id
        from public.candidates
        where recruiter_id = p_recruiter_id
          and lower(btrim(email)) = normalized_email
        limit 1;
    elsif normalized_phone is not null then
        select array_agg(id order by created_at asc nulls last, id asc)
        into phone_candidate_ids
        from public.candidates
        where recruiter_id = p_recruiter_id
          and nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '') = normalized_phone;

        if cardinality(phone_candidate_ids) = 1 then
            selected_candidate_id := phone_candidate_ids[1];
        end if;
    end if;

    if selected_candidate_id is null then
        insert into public.candidates (
            recruiter_id,
            name,
            email,
            phone,
            location,
            education,
            hard_skills,
            soft_skills,
            work_experience,
            resume_file_url,
            raw_text,
            extraction_status
        )
        values (
            p_recruiter_id,
            p_name,
            normalized_email,
            p_phone,
            p_location,
            p_education,
            p_hard_skills,
            p_soft_skills,
            p_work_experience,
            p_resume_file_url,
            p_raw_text,
            'completed'
        )
        returning id into selected_candidate_id;

        candidate_created := true;
    else
        select resume_file_url
        into previous_resume_file_url
        from public.candidates
        where id = selected_candidate_id
          and recruiter_id = p_recruiter_id
        for update;

        update public.candidates
        set
            name = p_name,
            email = coalesce(normalized_email, email),
            phone = p_phone,
            location = p_location,
            education = p_education,
            hard_skills = p_hard_skills,
            soft_skills = p_soft_skills,
            work_experience = p_work_experience,
            resume_file_url = p_resume_file_url,
            raw_text = p_raw_text,
            extraction_status = 'completed'
        where id = selected_candidate_id
          and recruiter_id = p_recruiter_id;
    end if;

    update public.match_results as match_result
    set
        status = 'pending',
        match_score = null,
        education_score = null,
        hard_skill_score = null,
        soft_skill_score = null,
        work_experience_score = null,
        gap_analysis = null,
        matched_skills = null,
        missing_skills = null,
        summary = null,
        processing_started_at = null,
        analysis_error = null
    where match_result.candidate_id = selected_candidate_id
      and exists (
          select 1
          from public.job_postings
          where id = match_result.job_id
            and recruiter_id = p_recruiter_id
      );

    select id
    into selected_match_result_id
    from public.match_results
    where job_id = p_job_id
      and candidate_id = selected_candidate_id;

    if selected_match_result_id is null then
        insert into public.match_results (
            job_id,
            candidate_id,
            status,
            recruitment_status
        )
        values (
            p_job_id,
            selected_candidate_id,
            'pending',
            'new'
        )
        returning id into selected_match_result_id;

        match_created := true;
    end if;

    return jsonb_build_object(
        'candidate_id', selected_candidate_id,
        'match_result_id', selected_match_result_id,
        'candidate_created', candidate_created,
        'match_created', match_created,
        'previous_resume_file_url', previous_resume_file_url
    );
end;
$$;

revoke all on function public.persist_candidate_resume_and_queue_matches(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text[],
    text[],
    text[],
    text[],
    text,
    text
)
from public, anon, authenticated;
grant execute on function public.persist_candidate_resume_and_queue_matches(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text[],
    text[],
    text[],
    text[],
    text,
    text
)
to service_role;

commit;
