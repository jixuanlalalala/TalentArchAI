import {
    Briefcase,
    ChevronRight,
    MapPin,
    Trash2,
    Users,
} from 'lucide-react';

export default function JobPostingsList({
    jobs,
    isLoading,
    onCreate,
    onSelect,
    onDelete,
}) {
    if (isLoading) {
        return (
            <div className="text-center text-sm text-slate-500 py-8">
                Loading job postings...
            </div>
        );
    }

    if (jobs.length === 0) {
        return (
            <div
                className="flex flex-col items-center justify-center bg-white border border-slate-100 shadow-sm rounded-3xl p-16 max-w-lg mx-auto my-12"
                id="job-empty-state"
            >
                <div className="relative w-20 h-20 bg-[#F4F7FF] rounded-2xl flex items-center justify-center border border-blue-100">
                    <Briefcase className="text-[#1D5BF2] w-10 h-10" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">
                    No job postings created
                </h3>
                <p className="text-sm text-slate-500 text-center max-w-sm font-medium leading-relaxed mb-6">
                    Your workspace is quite. Start by creating your first job
                    posting
                </p>

                <button
                    id="create-first-job-btn"
                    onClick={onCreate}
                    className="flex items-center justify-center gap-2 bg-[#1D5BF2] hover:bg-blue-700 text-white text-sm font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/10 active:scale-[0.98] cursor-pointer"
                >
                    <span>Create your first job</span>
                    <ChevronRight className="w-4 h-4" />
                </button>

                <div className="w-full border-t border-slate-100 my-6"></div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => {
                const salaryText = [job.salary_min, job.salary_max]
                    .filter(Boolean)
                    .join(' - ');
                const skills = Array.isArray(job.required_skills)
                    ? job.required_skills
                    : [];
                const candidateCount = job.candidate_count ?? 0;

                return (
                    <div
                        key={job.id}
                        onClick={() => onSelect(job.id)}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col justify-between cursor-pointer"
                    >
                        <div className="space-y-3">
                            <div className="flex items-start justify-between">
                                <span className="bg-blue-50 text-[#1D5BF2] text-[10px] font-bold px-2.5 py-1 rounded-full font-mono uppercase tracking-wider">
                                    {job.type}
                                </span>
                                <button
                                    id={`delete-job-${job.id}`}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onDelete(job.id);
                                    }}
                                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                    title="Delete Job"
                                >
                                    <Trash2 className="w-4.5 h-4.5" />
                                </button>
                            </div>

                            <div>
                                <h4 className="font-extrabold text-lg text-slate-900 leading-tight">
                                    {job.title}
                                </h4>
                                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mt-1.5">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>{job.location || 'Remote'}</span>
                                    {salaryText ? (
                                        <>
                                            <span className="text-slate-300">
                                                •
                                            </span>
                                            <span className="font-mono">
                                                RM {salaryText}
                                            </span>
                                        </>
                                    ) : null}
                                </div>
                            </div>

                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 font-medium">
                                {job.description || 'No description provided.'}
                            </p>

                            {skills.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {skills.map((skill, index) => (
                                        <span
                                            key={index}
                                            className="bg-slate-50 border border-slate-200/60 rounded-md text-[10px] font-bold text-slate-600 px-2 py-0.5 font-mono"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        <div className="border-t border-slate-100 mt-5 pt-4 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-slate-400" />
                                <span className="text-xs font-bold text-slate-500">
                                    {candidateCount} Candidate
                                    {candidateCount === 1 ? '' : 's'}
                                </span>
                            </div>

                            <button
                                onClick={() => onSelect(job.id)}
                                className="text-[#1D5BF2] hover:text-blue-700 text-xs font-bold flex items-center gap-1"
                            >
                                <span>Upload Resumes</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
