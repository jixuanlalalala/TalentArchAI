import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

const AUTO_DISMISS_MS = 6000;
const EXIT_ANIMATION_MS = 200;

const TOAST_STYLES = {
    success: {
        border: 'border-emerald-200',
        iconBackground: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
        Icon: CheckCircle2,
    },
    error: {
        border: 'border-rose-200',
        iconBackground: 'bg-rose-50',
        iconColor: 'text-rose-600',
        Icon: AlertCircle,
    },
    mixed: {
        border: 'border-amber-200',
        iconBackground: 'bg-amber-50',
        iconColor: 'text-amber-600',
        Icon: AlertCircle,
    },
};

function ToastCard({ notification, onDismiss }) {
    const [isLeaving, setIsLeaving] = useState(false);
    const autoDismissTimerRef = useRef(null);
    const removalTimerRef = useRef(null);
    const leavingRef = useRef(false);
    const style = TOAST_STYLES[notification.type] || TOAST_STYLES.success;
    const Icon = style.Icon;
    const isAssertive =
        notification.type === 'error' || notification.type === 'mixed';

    const dismiss = useCallback(() => {
        if (leavingRef.current) return;

        leavingRef.current = true;
        window.clearTimeout(autoDismissTimerRef.current);
        setIsLeaving(true);
        removalTimerRef.current = window.setTimeout(
            () => onDismiss(notification.id),
            EXIT_ANIMATION_MS
        );
    }, [notification.id, onDismiss]);

    useEffect(() => {
        autoDismissTimerRef.current = window.setTimeout(
            dismiss,
            AUTO_DISMISS_MS
        );

        return () => {
            window.clearTimeout(autoDismissTimerRef.current);
            window.clearTimeout(removalTimerRef.current);
        };
    }, [dismiss]);

    return (
        <div
            role={isAssertive ? 'alert' : 'status'}
            aria-live={isAssertive ? 'assertive' : 'polite'}
            aria-atomic="true"
            className={`pointer-events-auto w-full rounded-2xl border bg-white p-4 shadow-lg shadow-slate-900/10 transition-all duration-200 motion-reduce:animate-none motion-reduce:transition-none ${style.border} ${
                isLeaving
                    ? 'translate-x-4 opacity-0'
                    : 'animate-slide-in-right translate-x-0 opacity-100'
            }`}
        >
            <div className="flex items-start gap-3">
                <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.iconBackground} ${style.iconColor}`}
                >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-slate-900">
                        {notification.title}
                    </p>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                        {notification.message}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={dismiss}
                    aria-label={`Dismiss ${notification.title} notification`}
                    className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#1D5BF2] focus:ring-offset-2 cursor-pointer"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}

export default function ToastContainer({ notifications = [], onDismiss }) {
    if (notifications.length === 0) return null;

    return createPortal(
        <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
            {notifications.map((notification) => (
                <ToastCard
                    key={notification.id}
                    notification={notification}
                    onDismiss={onDismiss}
                />
            ))}
        </div>,
        document.body
    );
}
