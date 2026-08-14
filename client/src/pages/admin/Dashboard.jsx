import { useEffect, useState } from 'react';
import { Car, Wrench, Bell, Banknote, RefreshCw, ShieldCheck, Activity, Zap, CheckCircle2, AlertTriangle, ClipboardList } from 'lucide-react';
import api from '../../lib/axios';
import { toast } from 'react-toastify';
import clsx from 'clsx';

/* ─── Animation keyframes ─── */
const ANIM_STYLE = `
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulseRing {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50%       { transform: scale(1.5); opacity: 0; }
}
@keyframes countUp {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

function injectStyle(id, css) {
    if (typeof document !== 'undefined' && !document.getElementById(id)) {
        const el = document.createElement('style');
        el.id = id;
        el.textContent = css;
        document.head.appendChild(el);
    }
}

/* ─── Status badge ─── */
const StatusBadge = ({ status }) => {
    const map = {
        PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
        IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
        COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        AWAITING_APPROVAL: 'bg-violet-50 text-violet-700 border-violet-200',
        APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    const label = {
        PENDING: 'รอตรวจสอบ', IN_PROGRESS: 'กำลังซ่อม', COMPLETED: 'เสร็จสิ้น',
        AWAITING_APPROVAL: 'รออนุมัติ', APPROVED: 'อนุมัติแล้ว', REJECTED: 'ไม่อนุมัติ',
    };
    return (
        <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-semibold border inline-block', map[status] || 'bg-slate-50 text-slate-600 border-slate-200')}>
            {label[status] || status}
        </span>
    );
};

/* ─── Alert type label mapping ─── */
const alertTypeLabel = {
    OIL_CHANGE: 'เปลี่ยนถ่ายน้ำมันเครื่อง',
    TIRE_CHANGE: 'เปลี่ยนยาง',
    GENERAL: 'ซ่อมทั่วไป',
    MAINTENANCE: 'บำรุงรักษาตามระยะ',
    EMERGENCY: 'ซ่อมฉุกเฉิน',
    'เปลี่ยนถ่ายน้ำมันเครื่อง': 'เปลี่ยนถ่ายน้ำมันเครื่อง',
    'เปลี่ยนยาง 4 เส้น': 'เปลี่ยนยาง',
    'เปลี่ยนยาง': 'เปลี่ยนยาง',
};

/* ─── Alert badge ─── */
const AlertBadge = ({ status }) => {
    if (status === 'OVERDUE') return <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">เลยกำหนด</span>;
    if (status === 'UPCOMING') return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">ใกล้กำหนด</span>;
    return <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">แก้ไขแล้ว</span>;
};

/* ─── Skeleton loader ─── */
const Skeleton = ({ className }) => (
    <div
        className={clsx('rounded-2xl', className)}
        style={{
            background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
        }}
    />
);

/* ─── KPI Card ─── */
function KpiCard({ label, value, unit, subLabel, subValue, accentColor, iconBg, icon, delay = 0 }) {
    return (
        <div
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm group cursor-default relative overflow-hidden"
            style={{ animation: `fadeSlideUp 0.5s ease-out ${delay}ms both`, transition: 'box-shadow 0.2s, transform 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 30px -4px rgba(124,58,237,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
        >
            <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full" style={{ background: accentColor }} />
            <div className="flex items-center justify-between">
                <div className="pl-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
                    <h3 className="text-2xl font-extrabold text-slate-800" style={{ animation: `countUp 0.4s ease-out ${delay + 100}ms both` }}>
                        {value} <span className="text-sm font-medium text-slate-400">{unit}</span>
                    </h3>
                    {subLabel && (
                        <p className="text-xs font-medium mt-1" style={{ color: accentColor }}>{subLabel} {subValue}</p>
                    )}
                </div>
                <div className="p-3 rounded-2xl shrink-0 transition-transform duration-300 group-hover:scale-110" style={{ background: iconBg }}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    injectStyle('admin-dash-anim', ANIM_STYLE);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        api.get('/reports/dashboard')
            .then(res => { if (!cancelled) { setLoading(false); setError(false); setData(res.data); } })
            .catch(() => {
                if (!cancelled) { setLoading(false); setError(true); toast.error('ไม่สามารถโหลดข้อมูล Dashboard ได้'); }
            });
        return () => { cancelled = true; };
    }, [retryKey]);

    const stats = data?.stats || {};

    /* ─── Loading ─── */
    if (loading) {
        return (
            <div className="space-y-6 pb-12">
                <Skeleton className="h-40 rounded-3xl" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                </div>
            </div>
        );
    }

    /* ─── Error ─── */
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-80 gap-5">
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                    <AlertTriangle size={32} className="text-rose-500" />
                </div>
                <div className="text-center">
                    <p className="text-base font-bold text-slate-700 mb-1">ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้</p>
                    <p className="text-sm text-slate-400">กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง</p>
                </div>
                <button
                    onClick={() => setRetryKey(k => k + 1)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 12px -2px rgba(124,58,237,0.4)' }}
                >
                    <RefreshCw size={15} />
                    ลองใหม่
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">

            {/* ── Command Banner ── */}
            <div
                className="relative overflow-hidden rounded-3xl text-white p-6 md:p-8"
                style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #312e81 75%, #1e1b4b 100%)',
                    boxShadow: '0 20px 40px -8px rgba(15,23,42,0.4)',
                    animation: 'fadeSlideUp 0.45s ease-out both',
                }}
            >
                <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)' }} />
                <div className="pointer-events-none absolute -bottom-12 -left-8 w-48 h-48 rounded-full opacity-15"
                    style={{ background: 'radial-gradient(circle, #4f46e5, transparent 70%)' }} />
                <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
                    style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(167,139,250,0.3)' }}>
                            <ShieldCheck size={13} className="text-violet-300" />
                            <span className="text-violet-200">System Administrator</span>
                            <span className="relative flex h-2 w-2 ml-0.5">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
                                    style={{ animation: 'pulseRing 1.8s ease-out infinite' }} />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                            </span>
                            <span className="text-emerald-300 ml-0.5">Live</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">ภาพรวมระบบ (Dashboard)</h1>
                        <p className="text-sm text-slate-300 mt-1.5 max-w-lg">สรุปสถานะรถยนต์ คำร้องซ่อม และแจ้งเตือนบำรุงรักษาทั้งหมดในระบบ</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 flex-wrap">
                        <div className="flex items-center gap-3 rounded-2xl px-5 py-4"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
                            <div className="p-2.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.2)' }}>
                                <Car size={20} className="text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 leading-none mb-0.5">รถพร้อมใช้</div>
                                <div className="text-2xl font-extrabold text-white leading-none">
                                    {stats.readyVehicles || 0} <span className="text-sm font-medium text-slate-300">คัน</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-2xl px-5 py-4"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
                            <div className="p-2.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.2)' }}>
                                <ClipboardList size={20} className="text-amber-400" />
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 leading-none mb-0.5">รออนุมัติ</div>
                                <div className="text-2xl font-extrabold text-white leading-none">
                                    {stats.pendingRepairs || 0} <span className="text-sm font-medium text-slate-300">รายการ</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 mt-5 pt-4 border-t flex flex-wrap items-center gap-6"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div>
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">ค่าซ่อมเดือนนี้</span>
                        <div className="text-xl font-extrabold text-white mt-0.5">
                            ฿{(stats.monthlyExpense || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="h-8 w-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
                    <div>
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">แจ้งเตือนด่วนค้างอยู่</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="text-xl font-extrabold text-white">{stats.overdueAlerts || 0}</div>
                            {(stats.overdueAlerts || 0) > 0
                                ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">⚠ ต้องดำเนินการ</span>
                                : <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">✓ ปกติ</span>
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    label="รถยนต์ในระบบ" value={stats.totalVehicles || 0} unit="คัน"
                    subLabel="พร้อมใช้งาน" subValue={`${stats.readyVehicles || 0} คัน`}
                    accentColor="#3b82f6" iconBg="linear-gradient(135deg,#dbeafe,#bfdbfe)"
                    icon={() => <Car size={22} className="text-blue-600" />} delay={60}
                />
                <KpiCard
                    label="คำร้องรออนุมัติ" value={stats.pendingRepairs || 0} unit="รายการ"
                    accentColor="#f59e0b" iconBg="linear-gradient(135deg,#fef3c7,#fde68a)"
                    icon={() => <Wrench size={22} className="text-amber-600" />} delay={120}
                />
                <KpiCard
                    label="แจ้งเตือนด่วน" value={stats.overdueAlerts || 0} unit="รายการ"
                    accentColor="#f43f5e" iconBg="linear-gradient(135deg,#ffe4e6,#fecdd3)"
                    icon={() => <Bell size={22} className="text-rose-500" />} delay={180}
                />
                <KpiCard
                    label="ค่าซ่อมเดือนนี้" value={(stats.monthlyExpense || 0).toLocaleString('th-TH')} unit="บาท"
                    accentColor="#10b981" iconBg="linear-gradient(135deg,#d1fae5,#a7f3d0)"
                    icon={() => <Banknote size={22} className="text-emerald-600" />} delay={240}
                />
            </div>

            {/* ── Tables ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Maintenance Alerts */}
                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden"
                    style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', animation: 'fadeSlideUp 0.5s ease-out 0.28s both' }}>
                    <div className="px-6 py-5 flex items-center justify-between"
                        style={{ borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(to right, #faf5ff, #f8fafc)' }}>
                        <div>
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-amber-100"><Bell size={14} className="text-amber-600" /></span>
                                แจ้งเตือนบำรุงรักษา
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">รายการที่ยังไม่ได้แก้ไข</p>
                        </div>
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                            {data?.maintenanceAlerts?.length || 0} รายการ
                        </span>
                    </div>
                    <div className="md:hidden divide-y divide-slate-50">
                        {!data?.maintenanceAlerts?.length && (
                            <div className="flex flex-col items-center py-10 gap-2">
                                <CheckCircle2 size={28} className="text-emerald-300" />
                                <p className="text-sm text-slate-400">ไม่มีการแจ้งเตือน</p>
                            </div>
                        )}
                        {data?.maintenanceAlerts?.map(alert => (
                            <div key={alert.alert_id} className="p-4 hover:bg-violet-50/30 transition-colors">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold text-slate-800 text-sm">{alert.vehicle?.license_plate}</p>
                                    <AlertBadge status={alert.is_resolved ? 'DONE' : 'UPCOMING'} />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{alertTypeLabel[alert.alert_type] || alert.alert_type}</p>
                            </div>
                        ))}
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead style={{ background: '#faf5ff', borderBottom: '1px solid #f1f5f9' }}>
                                <tr>
                                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">ทะเบียนรถ</th>
                                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">ประเภท</th>
                                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {!data?.maintenanceAlerts?.length && (
                                    <tr><td colSpan={3}><div className="flex flex-col items-center py-10 gap-2"><CheckCircle2 size={28} className="text-emerald-300" /><p className="text-sm text-slate-400">ไม่มีการแจ้งเตือน</p></div></td></tr>
                                )}
                                {data?.maintenanceAlerts?.map(alert => (
                                    <tr key={alert.alert_id} className="transition-colors duration-150"
                                        onMouseEnter={e => e.currentTarget.style.background = '#faf5ff'}
                                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                                        <td className="px-6 py-4 font-semibold text-slate-800">{alert.vehicle?.license_plate}</td>
                                        <td className="px-6 py-4 text-slate-500">{alertTypeLabel[alert.alert_type] || alert.alert_type}</td>
                                        <td className="px-6 py-4"><AlertBadge status={alert.is_resolved ? 'DONE' : 'UPCOMING'} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Repairs */}
                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden"
                    style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', animation: 'fadeSlideUp 0.5s ease-out 0.36s both' }}>
                    <div className="px-6 py-5 flex items-center justify-between"
                        style={{ borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(to right, #faf5ff, #f8fafc)' }}>
                        <div>
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-violet-100"><Wrench size={14} className="text-violet-600" /></span>
                                คำร้องซ่อมล่าสุด
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">8 รายการล่าสุดในระบบ</p>
                        </div>
                        <span className="text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                            <Activity size={11} /> ข้อมูลจริง
                        </span>
                    </div>
                    <div className="md:hidden divide-y divide-slate-50">
                        {!data?.recentRepairs?.length && (
                            <div className="flex flex-col items-center py-10 gap-2">
                                <Zap size={28} className="text-slate-200" />
                                <p className="text-sm text-slate-400">ไม่มีคำร้องซ่อม</p>
                            </div>
                        )}
                        {data?.recentRepairs?.map(r => (
                            <div key={r.request_id} className="p-4 hover:bg-violet-50/30 transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="font-semibold text-slate-800 text-sm">{r.vehicle?.license_plate}</p>
                                    <StatusBadge status={r.status} />
                                </div>
                                <p className="text-xs text-slate-500 truncate">{r.description}</p>
                                <p className="text-xs text-slate-400 mt-1">{new Date(r.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}</p>
                            </div>
                        ))}
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead style={{ background: '#faf5ff', borderBottom: '1px solid #f1f5f9' }}>
                                <tr>
                                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">วันที่</th>
                                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">ทะเบียน / ปัญหา</th>
                                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {!data?.recentRepairs?.length && (
                                    <tr><td colSpan={3}><div className="flex flex-col items-center py-10 gap-2"><Zap size={28} className="text-slate-200" /><p className="text-sm text-slate-400">ไม่มีคำร้องซ่อม</p></div></td></tr>
                                )}
                                {data?.recentRepairs?.map(r => (
                                    <tr key={r.request_id} className="transition-colors duration-150"
                                        onMouseEnter={e => e.currentTarget.style.background = '#faf5ff'}
                                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                                        <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                                            {new Date(r.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-800">{r.vehicle?.license_plate}</div>
                                            <div className="text-xs text-slate-400 mt-0.5 max-w-55 truncate">{r.description}</div>
                                        </td>
                                        <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
