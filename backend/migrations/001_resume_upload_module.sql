-- Run this migration once in the Supabase SQL editor.
-- It does not alter existing candidate or matching-result column types.

begin;

update storage.buckets
set
    public = false,
    file_size_limit = 20971520,
    allowed_mime_types = array[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
where id = 'resumes';

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.match_results'::regclass
          and conname = 'match_results_job_candidate_key'
    ) then
        alter table public.match_results
            add constraint match_results_job_candidate_key
            unique (job_id, candidate_id);
    end if;
end
$$;

create unique index if not exists candidates_recruiter_normalized_email_key
on public.candidates (
    recruiter_id,
    lower(btrim(email))
)
where email is not null
  and btrim(email) <> '';

commit;
