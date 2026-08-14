import {useState} from 'react';
import { 
  Users, Briefcase, BarChart3, User, LogOut
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import {useAuth} from '../context/AuthContext';         
import JobsTab from './JobsTab';
import CandidatesTab from './CandidatesTab';
import ReportsTab from './ReportsTab';
import ProfileTab from './ProfileTab';
import { testFlaskConnection } from '../services/api';

export default function Dashboard() {

    const [activeTab, setActiveTab] = useState('jobs');
    const [selectedReportJobId, setSelectedReportJobId] = useState(null);
    const [testMessage, setTestMessage] = useState('');
    const [testError, setTestError] = useState('');
    const { signOut } = useAuth();

    const navigate = useNavigate();

    const handleSignOut = async () => {
        const { error } = await signOut();
        if (error) {
            console.error('Error signing out:', error.message);
        } else {
            navigate('/login');
        }
    };

    const handleTestConnection = async () => {
        setTestMessage('Testing Flask connection...');
        setTestError('');

        try {
            const result = await testFlaskConnection();
            setTestMessage(`Success: ${JSON.stringify(result)}`);
        } catch (error) {
            setTestError(error.message || 'Connection failed');
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-[#F8FAFC] text-slate-800 font-sans flex flex-col md:flex-row antialiased relative">
            {/* Sidebar navigation */}
            <aside className="w-full md:w-64 md:fixed md:inset-y-0 md:left-0 md:h-screen bg-[#F1F5F9] border-r border-slate-200 flex flex-col justify-between shrink-0 p-6">
                <div>
                    <div className='mb-8 mt-2'>
                        <h1 className='font-extrabold text-[#1D5BF2] text-2xl tracking-tight leading-none"'>
                            TalentArch AI
                            </h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                            Recruitment Engine
                        </p>
                    </div>

                    <nav className='space-y-1.5'>
                        <button
                            id='nav-jobs'
                            onClick={() => { setActiveTab('jobs');}}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                                activeTab === 'jobs'
                                    ? 'bg-white text-[#1D5BF2] shadow-sm shadow-slate-200/50'
                                    : 'text-slate-600 hover:bg-white/50 hover:text-[#1D5BF2]'
                            }`}
                        >
                            <Briefcase className='w-5 h-5 shrink-0'/>
                            <span>Job Postings</span>
                        </button>

                        <button
                            id='nav-candidates'
                            onClick={() => { setActiveTab('candidates');}}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                                activeTab === 'candidates'
                                    ? 'bg-white text-[#1D5BF2] shadow-sm shadow-slate-200/50'
                                    : 'text-slate-600 hover:bg-white/50 hover:text-[#1D5BF2]'
                            }`}>
                            <Users className='w-5 h-5 shrink-0'/>
                            <span>Candidates</span>
                        </button>

                        <button
                            id='nav-reports'
                            onClick={() => { setActiveTab('reports');}}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                                activeTab === 'reports'
                                    ? 'bg-white text-[#1D5BF2] shadow-sm shadow-slate-200/50'
                                    : 'text-slate-600 hover:bg-white/50 hover:text-[#1D5BF2]'
                            }`}>
                            <BarChart3 className='w-5 h-5 shrink-0'/>
                            <span>Reports</span>
                        </button>

                        <button
                            id='nav-profile'
                            onClick={() => { setActiveTab('profile');}}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                                activeTab === 'profile'
                                    ? 'bg-white text-[#1D5BF2] shadow-sm shadow-slate-200/50'
                                    : 'text-slate-600 hover:bg-white/50 hover:text-[#1D5BF2]'
                            }`}>
                            <User className='w-5 h-5 shrink-0'/>
                            <span>Profile</span>
                        </button>
                    </nav>
                </div>

                <div contentlassName="mt-8 border-t border-slate-200/60 pt-4">
                    <button
                        id='nav-logout'  
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all"
                        onClick={handleSignOut}
                    >
                        <LogOut className='w-5 h-5 shrink-0'/>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTAINER */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 md:ml-64">
                {/** Header Bar */}
                <header className="bg-white border-b border-slate-100 px-8 py-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
                    <div></div>
                    {/* <button
                        onClick={handleTestConnection}
                        className="px-4 py-2 rounded-full bg-[#1D5BF2] text-white font-semibold hover:bg-[#174dc0] transition"
                    >
                        Test Flask auth
                    </button> */}

                    {/**User profile badge on the top-right corner  */}
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                        <button
                            id='top-profile-badge'
                            onClick={()=>setActiveTab('profile')}
                            className="w-8 h-8 rounded-full bg-blue-100 text-[#1D5BF2] hover:bg-blue-200 transition-colors flex items-center justify-center border border-blue-200/40 cursor-pointer"
                        >
                            <User className='w-5 h-5'></User>
                        </button>
                    </div>
                </header>

                {/** Main Content Canvas */}
                <main className="flex-1 min-h-0 p-8 overflow-y-auto">
                    {(testMessage || testError) && (
                        <div className="m-6 rounded-xl border p-4 text-sm">
                            {testMessage && <p className="text-emerald-700">{testMessage}</p>}
                            {testError && <p className="text-rose-600">{testError}</p>}
                        </div>
                    )}
                    {activeTab === 'jobs' && (
                        <JobsTab
                            onViewReport={(jobId) => {
                                setSelectedReportJobId(jobId || null);
                                setActiveTab('reports');
                            }}
                        />
                    )}

                    {activeTab === 'candidates' && (
                        <CandidatesTab />
                    )}

                    {activeTab === 'reports' && (
                        <ReportsTab initialJobId={selectedReportJobId} />
                    )}

                    {activeTab === 'profile' && (
                        <ProfileTab />
                    )}
                </main>
            </div>
        </div>
    );
}
