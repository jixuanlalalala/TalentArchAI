/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useEffect} from 'react';
import { Briefcase, Download, PlusCircle, ChevronRight, MapPin, Trash2, Users } from 'lucide-react';
// import  api  from '../services/api';

export default function JobsTab({
    
}) {
//     useEffect(() => {
//  api.get('/test')    // using api (axios), not fetch
//     .then(res => console.log('Axios test response:', res.data.headers))
//     .catch(err => console.log('Axios test error:', err));
// }, []);
    return (
        <div className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Job Postings</h2>
            <p className="text-slate-600">
                Manage your job postings and view applications.
            </p>
        </div>
    );
}
