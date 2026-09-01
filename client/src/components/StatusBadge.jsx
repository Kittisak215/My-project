import clsx from 'clsx';
import { 
    Clock, 
    PlayCircle, 
    Hourglass, 
    CheckCircle2, 
    XCircle, 
    CheckSquare,
    AlertTriangle,
    Car,
    Wrench,
    AlertCircle,
    Info
} from 'lucide-react';

export default function StatusBadge({ status, type = 'repair', className = '' }) {
    
    if (type === 'repair') {
        const config = {
            PENDING: { label: 'รอตรวจสอบ', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
            IN_PROGRESS: { label: 'กำลังดำเนินการ', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: PlayCircle },
            AWAITING_APPROVAL: { label: 'รออนุมัติ', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Hourglass },
            APPROVED: { label: 'อนุมัติแล้ว', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckSquare },
            REJECTED: { label: 'ไม่อนุมัติ', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
            COMPLETED: { label: 'ซ่อมเสร็จสิ้น', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold', icon: CheckCircle2 }
        };

        const current = config[status] || { label: status, color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Info };
        const Icon = current.icon;

        return (
            <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] md:text-xs font-medium border", current.color, className)}>
                <Icon size={14} className="shrink-0" />
                {current.label}
            </span>
        );
    }

    if (type === 'vehicle') {
        const config = {
            READY: { label: 'พร้อมใช้งาน', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Car },
            IN_REPAIR: { label: 'กำลังซ่อม', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Wrench }
        };

        const current = config[status] || { label: status, color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Car };
        const Icon = current.icon;

        return (
            <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", current.color, className)}>
                <Icon size={14} className="shrink-0" />
                {current.label}
            </span>
        );
    }

    if (type === 'alert') {
        const config = {
            OVERDUE: { label: 'เลยกำหนด', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
            UPCOMING: { label: 'ใกล้ถึงกำหนด', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle },
            DONE: { label: 'ดำเนินการแล้ว', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: CheckCircle2 }
        };

        const current = config[status] || { label: status, color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Info };
        const Icon = current.icon;

        return (
            <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", current.color, className)}>
                <Icon size={14} className="shrink-0" />
                {current.label}
            </span>
        );
    }

    return null;
}
