import { useRef, useState } from 'react';
import { CheckCircle2, FileText, UploadCloud, X, XCircle } from 'lucide-react';
import { uploadResumes } from '../services/resumeService';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_FILES = 10;
const ALLOWED_TYPES = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const validateFiles = (files) => {
    const validFiles = [];
    const errors = [];

    files.forEach((file) => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!extension || !ALLOWED_TYPES[extension]) {
            errors.push(`${file.name}: Only PDF and DOCX files are supported.`);
            return;
        }
        if (file.type !== ALLOWED_TYPES[extension]) {
            errors.push(`${file.name}: The file MIME type does not match its extension.`);
            return;
        }
        if (file.size === 0) {
            errors.push(`${file.name}: The file is empty.`);
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            errors.push(`${file.name}: The file exceeds the 20 MB size limit.`);
            return;
        }
        validFiles.push(file);
    });

    return { validFiles, errors };
};

export default function UploadResumesModal({
    isOpen,
    onClose,
    jobId,
    onUploadComplete,
}) {
    const inputRef = useRef(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [validationErrors, setValidationErrors] = useState([]);
    const [results, setResults] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const addFiles = (fileList) => {
        const incomingFiles = Array.from(fileList || []);
        const { validFiles, errors } = validateFiles(incomingFiles);
        const combined = [...selectedFiles];

        validFiles.forEach((file) => {
            const duplicate = combined.some(
                (existing) =>
                    existing.name === file.name &&
                    existing.size === file.size &&
                    existing.lastModified === file.lastModified
            );
            if (!duplicate) combined.push(file);
        });

        if (combined.length > MAX_FILES) {
            errors.push(`A maximum of ${MAX_FILES} files is allowed.`);
        }

        setSelectedFiles(combined.slice(0, MAX_FILES));
        setValidationErrors(errors);
        setResults([]);
        if (inputRef.current) inputRef.current.value = '';
    };

    const handleClose = () => {
        if (isSubmitting) {
            onClose();
            return;
        }
        setSelectedFiles([]);
        setValidationErrors([]);
        setResults([]);
        onClose();
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;
        if (!jobId) {
            setValidationErrors(['Select a job posting before uploading resumes.']);
            return;
        }
        if (!selectedFiles.length) {
            setValidationErrors(['Select at least one PDF or DOCX resume.']);
            return;
        }

        setIsSubmitting(true);
        setValidationErrors([]);
        setResults([]);
        try {
            const response = await uploadResumes(jobId, selectedFiles);
            const uploadResults = response.results || [];
            if (uploadResults.some((result) => result.status === 'completed')) {
                setSelectedFiles([]);
                setValidationErrors([]);
                setResults([]);
                onUploadComplete?.(uploadResults);
            } else {
                setResults(uploadResults);
            }
        } catch (error) {
            if (Array.isArray(error.payload?.results) && error.payload.results.length) {
                setResults(error.payload.results);
            } else {
                setValidationErrors([
                    error.message || 'The resumes could not be uploaded.',
                ]);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-xl w-full overflow-hidden flex flex-col animate-scale-up">
                <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 shrink-0">
                    <h3 className="text-lg font-bold text-slate-900">Upload Resumes</h3>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        aria-label="Close resume upload"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto max-h-[80vh] font-medium text-slate-700">
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(event) => addFiles(event.target.files)}
                        className="hidden"
                    />

                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                            event.preventDefault();
                            addFiles(event.dataTransfer.files);
                        }}
                        disabled={isSubmitting}
                        className="w-full bg-white border-2 border-dashed rounded-3xl p-10 text-center flex flex-col items-center justify-center transition-all cursor-pointer border-slate-200 hover:border-blue-400 hover:bg-slate-50/30 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <div className="w-14 h-14 bg-blue-50 border border-blue-100 text-[#1D5BF2] rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                            <UploadCloud className="w-7 h-7" />
                        </div>
                        <span className="text-sm font-bold text-slate-700">
                            Select or drag PDF and DOCX resumes
                        </span>
                        <span className="text-xs text-slate-400 mt-1">
                            Maximum 20 MB per file
                        </span>
                    </button>

                    {selectedFiles.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                                Selected Files
                            </p>
                            {selectedFiles.map((file) => (
                                <div
                                    key={`${file.name}-${file.size}-${file.lastModified}`}
                                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                                >
                                    <FileText className="w-4 h-4 text-[#1D5BF2] shrink-0" />
                                    <span className="text-xs font-semibold text-slate-700 truncate">
                                        {file.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {validationErrors.length > 0 && (
                        <div className="space-y-2">
                            {validationErrors.map((message, index) => (
                                <div
                                    key={`${message}-${index}`}
                                    className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"
                                >
                                    <XCircle className="w-4 h-4 shrink-0" />
                                    <span>{message}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {isSubmitting ? (
                        <div
                            role="status"
                            aria-live="polite"
                            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-[#1D5BF2]"
                        >
                            Uploading resumes and extracting candidate
                            information. You may close this window while processing
                            continues.
                        </div>
                    ) : null}

                    {results.length > 0 && (
                        <div className="space-y-2">
                            {results.map((result, index) => (
                                <div
                                    key={`${result.original_filename}-${result.status}-${index}`}
                                    className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-xs ${
                                        result.status === 'completed'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : 'border-rose-200 bg-rose-50 text-rose-700'
                                    }`}
                                >
                                    {result.status === 'completed' ? (
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    ) : (
                                        <XCircle className="w-4 h-4 shrink-0" />
                                    )}
                                    <div>
                                        <p className="font-bold">{result.original_filename}</p>
                                        <p className="mt-0.5">{result.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                        >
                            {isSubmitting ? 'Close' : 'Cancel'}
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || selectedFiles.length === 0}
                            className="bg-[#1D5BF2] hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/15 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Processing...' : 'Upload Resumes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
