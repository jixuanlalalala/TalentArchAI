-- Candidate Database: allow one candidate deletion to remove only its
-- job-specific match results. Apply to the development Supabase project.

begin;

do $$
declare
    orphaned_match_count bigint;
begin
    select count(*)
    into orphaned_match_count
    from public.match_results as match_result
    left join public.candidates as candidate
      on candidate.id = match_result.candidate_id
    where candidate.id is null;

    if orphaned_match_count > 0 then
        raise exception
            'Migration stopped: % orphaned candidate match result(s) found.',
            orphaned_match_count;
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.match_results'::regclass
          and conname = 'match_results_candidate_id_fkey'
          and confrelid = 'public.candidates'::regclass
          and contype = 'f'
    ) then
        raise exception
            'Migration stopped: expected match_results_candidate_id_fkey was not found.';
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.match_results'::regclass
          and conname = 'match_results_candidate_id_fkey'
          and confrelid = 'public.candidates'::regclass
          and contype = 'f'
          and confdeltype = 'c'
    ) then
        alter table public.match_results
            drop constraint match_results_candidate_id_fkey;

        alter table public.match_results
            add constraint match_results_candidate_id_fkey
            foreign key (candidate_id)
            references public.candidates(id)
            on delete cascade;
    end if;
end
$$;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.match_results'::regclass
          and conname = 'match_results_candidate_id_fkey'
          and confrelid = 'public.candidates'::regclass
          and contype = 'f'
          and confdeltype = 'c'
    ) then
        raise exception
            'Migration verification failed: candidate foreign key is not ON DELETE CASCADE.';
    end if;
end
$$;

commit;
