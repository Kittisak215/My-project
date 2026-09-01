/*
 * THESIS: Executive fleet command room — a single surface where leadership reads fleet health at a glance.
 *   Refuses the generic hero-metric template by anchoring metrics inside a signature purple command banner
 *   with animated pulse indicators and a structured analytics grid.
 * OWN-WORLD: Deep purple-to-indigo command palette (#7c3aed → #4f46e5), slate neutrals, emerald/amber/rose
 *   status signals. Prompt typeface throughout. Cards: rounded-2xl/3xl with 1px slate-100 border + soft shadow.
 * STORY: The executive opens the dashboard and sees fleet availability status + expense trend at a glance,
 *   then drills into the top-5 cost vehicles without leaving the page.
 * FIRST VIEWPORT: Full-width dark purple command banner (gradient slate-900→violet-950→indigo-950) holds
 *   headline + live status badges. Below: 3-column KPI strip. Below: 7/5 analytics grid (bar + donut). Below: table.
 * FORM: Operate mode. Code-led build. Purple-anchored design system per DESIGN.md.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md.
 */

import { useEffect, useState } from 'react';
import {
    TrendingUp, Car, Gauge, ClipboardList, BarChart3, PieChart,
    ShieldCheck, CheckCircle2, AlertTriangle, Wrench, Activity, Zap, X, Calendar, MapPin
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import api from '../../lib/axios';
import { toast } from 'react-toastify';
import clsx from 'clsx';

/* ─── Micro-animation keyframes injected once ─── */
const ANIM_STYLE = `
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulseRing {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50%       { transform: scale(1.45); opacity: 0; }
}
@keyframes countUp {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes barGrow {
  from { transform: scaleY(0); }
  to   { transform: scaleY(1); }
}
@keyframes dashoffset {
  from { stroke-dashoffset: 999; }
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

/* ─── Vehicle Expense Modal ─── */
function VehicleExpenseModal({ vehicleId, onClose }) {
    const [loading, setLoading] = useState(true);
    const [repairs, setRepairs] = useState([]);
    const [vehicle, setVehicle] = useState(null);

    useEffect(() => {
        if (!vehicleId) return;
        const fetchRepairs = async () => {
            setLoading(true);
            try {
                // Using the expense report endpoint to fetch specific vehicle's completed repairs
                const res = await api.get('/reports/expense', { params: { vehicleId, limit: 100 } });
                setRepairs(res.data.data || []);
                if (res.data.data?.length > 0) {
                    setVehicle(res.data.data[0].vehicle);
                }
            } catch (err) {
                console.error(err);
                toast.error('ไม่สามารถดึงข้อมูลประวัติการซ่อมได้');
            } finally {
                setLoading(false);
            }
        };
        fetchRepairs();
    }, [vehicleId]);

    if (!vehicleId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ animation: 'fadeSlideUp 0.3s ease-out both' }}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-800">ประวัติการซ่อมบำรุง</h2>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {vehicle ? `ทะเบียน ${vehicle.license_plate} (${vehicle.brand} ${vehicle.model})` : 'กำลังโหลด...'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-6 bg-slate-50/50 flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mb-4" />
                            <p className="text-sm text-slate-500 font-medium">กำลังโหลดประวัติ...</p>
                        </div>
                    ) : repairs.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">ไม่พบประวัติการซ่อมบำรุงที่อนุมัติแล้วของรถคันนี้</div>
                    ) : (
                        <div className="space-y-4">
                            {repairs.map(repair => (
                                <div key={repair.request_id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-violet-300 hover:shadow-md transition-all">
                                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3 border-b border-slate-100 pb-3">
                                        <div className="flex items-center gap-3">
                                            <StatusBadge status={repair.status} />
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${repair.repair_type === 'EMERGENCY' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                                {repair.repair_type === 'GENERAL' ? 'ซ่อมทั่วไป' : repair.repair_type === 'EMERGENCY' ? 'ซ่อมฉุกเฉิน' : repair.repair_type}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-extrabold text-violet-700">
                                                ฿{(repair.total_cost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mb-4">
                                        <p className="text-xs text-slate-400 mb-1">รายละเอียดปัญหา/การซ่อม:</p>
                                        <p className="text-sm text-slate-700 font-medium">{repair.issue_description || repair.description || 'ไม่ระบุรายละเอียด'}</p>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-400"/> วันที่: {new Date(repair.created_at).toLocaleDateString('th-TH')}</div>
                                        {repair.mileage && <div className="flex items-center gap-1.5"><Gauge size={14} className="text-slate-400"/> เลขไมล์: {repair.mileage.toLocaleString()} กม.</div>}
                                        {repair.garage?.name && <div className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400"/> อู่: {repair.garage.name}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── KPI Card ─── */
function KpiCard({ label, value, unit, icon, iconBg, hoverAccent, delay = 0 }) {
    const Icon = icon;
    return (
        <div
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between group cursor-default"
            style={{
                animation: `fadeSlideUp 0.5s ease-out ${delay}ms both`,
                transition: 'box-shadow 0.2s, transform 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 30px -4px rgba(124,58,237,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
        >
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{label}</p>
                <h3 className="text-2xl font-bold text-slate-800" style={{ animation: `countUp 0.4s ease-out ${delay + 100}ms both` }}>
                    {value} <span className="text-sm font-medium text-slate-400">{unit}</span>
                </h3>
            </div>
            <div
                className="p-3 rounded-2xl shrink-0 transition-transform duration-300 group-hover:scale-110"
                style={{ background: iconBg }}
            >
                <Icon size={22} className={hoverAccent} />
            </div>
        </div>
    );
}

/* ─── Section Header ─── */
function SectionHeader({ icon, iconGradient, iconShadow, title, subtitle, rightSlot }) {
    const Icon = icon;
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl text-white shadow-md" style={{ background: iconGradient, boxShadow: iconShadow }}>
                    <Icon size={20} />
                </div>
                <div>
                    <h2 className="text-base font-bold text-slate-800 leading-tight">{title}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
                </div>
            </div>
            {rightSlot}
        </div>
    );
}

/* ─── Rank Badge ─── */
function RankBadge({ rank }) {
    const styles = [
        'bg-amber-50 text-amber-600 border border-amber-200',
        'bg-slate-100 text-slate-500 border border-slate-200',
        'bg-orange-50 text-orange-500 border border-orange-200',
    ];
    return (
        <span className={clsx('w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0', styles[rank] ?? 'bg-slate-50 text-slate-400 border border-slate-100')}>
            {rank + 1}
        </span>
    );
}

export default function ExecutiveDashboard() {
    injectStyle('exec-dash-anim', ANIM_STYLE);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [barHover, setBarHover] = useState(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState(null);

    useEffect(() => {
        api.get('/reports/executive')
            .then(res => setData(res.data))
            .catch(() => toast.error('โหลดข้อมูลไม่สำเร็จ'))
            .finally(() => setLoading(false));
    }, []);

    /* ── Loading state ── */
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-80 gap-4">
                <div className="relative">
                    <div className="w-14 h-14 rounded-full border-4 border-violet-100 border-t-violet-600 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Zap size={16} className="text-violet-600" />
                    </div>
                </div>
                <p className="text-sm font-medium text-slate-400 animate-pulse tracking-wide">กำลังประมวลผลข้อมูลภาพรวมผู้บริหาร…</p>
            </div>
        );
    }

    /* ── Data ── */
    const stats = data?.stats || {};
    const yearlyExpenses = data?.yearlyExpenses || [];
    const topVehicles = data?.topVehicles || [];

    const yearlyExpenseTotal = stats.yearlyExpense || 0;
    const availabilityRate = stats.availabilityRate || 0;
    const totalMileage = stats.totalMileage || 0;
    const totalVehicles = stats.totalVehicles || 0;
    const readyVehicles = stats.readyVehicles || 0;
    const unavailableVehicles = stats.unavailableVehicles ?? Math.max(0, totalVehicles - readyVehicles);

    const maxCost = yearlyExpenses.length > 0 ? Math.max(...yearlyExpenses.map(y => y.totalCost), 1) : 1;

    /* Donut math */
    const radius = 46;
    const circ = 2 * Math.PI * radius;
    const readyStroke = (availabilityRate / 100) * circ;
    const isHealthy = availabilityRate >= 80;

    return (
        <div className="space-y-6 pb-12">

            {/* ══════════════════════════════════════════
                COMMAND BANNER — purple executive header
            ══════════════════════════════════════════ */}
            <div
                className="relative overflow-hidden rounded-3xl text-white p-6 md:p-8"
                style={{
                    background: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #3b0764 100%)',
                    boxShadow: '0 10px 30px -10px rgba(124,58,237,0.4)',
                    animation: 'fadeSlideUp 0.45s ease-out both',
                }}
            >
                {/* Ambient glow blobs */}
                <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.8), transparent 70%)' }} />
                <div className="pointer-events-none absolute -bottom-16 -left-10 w-56 h-56 rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.6), transparent 70%)' }} />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    {/* Left: Title */}
                    <div>
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-violet-100 border border-white/20 backdrop-blur-sm">
                            <ShieldCheck size={13} className="text-violet-300" />
                            <span>Executive Analytics</span>
                            {/* Live ping */}
                            <span className="relative flex h-2 w-2 ml-0.5">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
                                    style={{ animation: 'pulseRing 1.8s ease-out infinite' }} />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                            </span>
                            <span className="text-emerald-300 ml-0.5">Live</span>
                        </div>

                        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight leading-tight text-white">
                            ภาพรวมผู้บริหาร
                        </h1>
                        <p className="text-sm text-violet-200 mt-1.5 max-w-lg leading-relaxed">
                            สรุปสถานะการซ่อมบำรุงและค่าใช้จ่ายของยานพาหนะทั้งหมด
                        </p>
                    </div>

                    {/* Right: Vehicle count widget */}
                    <div className="flex items-center gap-3 shrink-0 flex-wrap">
                        <div className="flex flex-col items-center gap-2 sm:flex-row rounded-2xl px-5 py-4 bg-white/10 border border-white/20 backdrop-blur-md">
                            <div className="p-2.5 rounded-xl bg-white/20">
                                <Car size={20} className="text-white" />
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-violet-200 mb-0.5">รถในระบบทั้งหมด</div>
                                <div className="text-2xl font-extrabold text-white leading-none">{totalVehicles} <span className="text-sm font-medium text-violet-200">คัน</span></div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-2 sm:flex-row rounded-2xl px-5 py-4 bg-white/10 border border-white/20 backdrop-blur-md">
                            <div className="p-2.5 rounded-xl bg-amber-500/20">
                                <Wrench size={20} className="text-amber-300" />
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-violet-200 mb-0.5">กำลังซ่อมบำรุง</div>
                                <div className="text-2xl font-extrabold text-white leading-none">
                                    {unavailableVehicles} <span className="text-sm font-medium text-violet-200">คัน</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Expense total strip at bottom of banner */}
                <div className="relative z-10 mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-6">
                    <div>
                        <span className="text-xs font-semibold uppercase tracking-widest text-violet-300">ค่าซ่อมรวมปีปัจจุบัน</span>
                        <div className="text-xl md:text-2xl font-extrabold text-white mt-0.5">
                            ฿{yearlyExpenseTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div>
                        <span className="text-xs font-semibold uppercase tracking-widest text-violet-300">ระยะทางสะสมรวม</span>
                        <div className="text-xl md:text-2xl font-extrabold text-white mt-0.5">
                            {totalMileage.toLocaleString('th-TH')} <span className="text-sm font-medium text-violet-200">กม.</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div>
                        <span className="text-xs font-semibold uppercase tracking-widest text-violet-300">ความพร้อมยานพาหนะ</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="text-xl md:text-2xl font-extrabold text-white">{availabilityRate}%</div>
                            <span className={clsx(
                                'text-xs font-bold px-2 py-0.5 rounded-full',
                                isHealthy ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            )}>
                                {isHealthy ? '✓ สมบูรณ์' : '⚠ เฝ้าระวัง'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════
                ANALYTICS GRID — Bar Chart + Donut
            ══════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* ── Bar Chart (7 cols) ── */}
                <div
                    className="lg:col-span-7 bg-white rounded-3xl p-6 md:p-8 border border-slate-100 flex flex-col"
                    style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', animation: 'fadeSlideUp 0.5s ease-out 0.25s both' }}
                >
                    <SectionHeader
                        icon={BarChart3}
                        iconGradient="linear-gradient(135deg,#7c3aed,#4f46e5)"
                        iconShadow="0 4px 12px -2px rgba(124,58,237,0.35)"
                        title="ค่าใช้จ่ายซ่อมบำรุงรายปี"
                        subtitle="เปรียบเทียบยอดรวมแต่ละปี"
                        rightSlot={
                            <div className="text-right">
                                <div className="text-xs text-slate-400 font-medium">รวมปีปัจจุบัน</div>
                                <div className="text-lg font-extrabold" style={{ color: '#7c3aed' }}>
                                    ฿{yearlyExpenseTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        }
                    />

                    {/* Chart */}
                    {yearlyExpenses.length > 0 ? (
                        <div className="flex-1 mt-2">
                            <div className="relative h-60 flex items-end justify-around gap-3 px-2 pb-0">
                                {/* Grid lines */}
                                <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col justify-between pointer-events-none">
                                    {[0, 1, 2, 3].map(i => (
                                        <div key={i} className="border-b border-dashed border-slate-100 w-full" />
                                    ))}
                                </div>

                                {yearlyExpenses.map((item, idx) => {
                                    const pct = Math.max(Math.round((item.totalCost / maxCost) * 100), 8);
                                    const isHovered = barHover === idx;
                                    return (
                                        <div
                                            key={item.year}
                                            className="relative z-10 flex flex-col items-center flex-1 max-w-[110px] h-full justify-end"
                                            onMouseEnter={() => setBarHover(idx)}
                                            onMouseLeave={() => setBarHover(null)}
                                        >
                                            {/* Tooltip */}
                                            <div className="mb-2" style={{ transform: isHovered ? 'translateY(-4px)' : '', transition: 'transform 0.2s' }}>
                                                <span className="text-xs font-bold px-2.5 py-1 rounded-xl whitespace-nowrap transition-all duration-200 inline-block"
                                                    style={{
                                                        background: isHovered ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : '#f1f5f9',
                                                        color: isHovered ? '#fff' : '#475569',
                                                        boxShadow: isHovered ? '0 4px 12px -2px rgba(124,58,237,0.4)' : '0 1px 2px rgba(0,0,0,0.06)',
                                                    }}>
                                                    ฿{item.totalCost.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                                                </span>
                                            </div>

                                            {/* Bar */}
                                            <div className="w-full h-44 flex items-end justify-center">
                                                <div
                                                    className="w-full rounded-t-2xl relative overflow-hidden transition-all duration-300"
                                                    style={{
                                                        height: `${pct}%`,
                                                        background: isHovered
                                                            ? 'linear-gradient(to top, #6d28d9, #8b5cf6, #a78bfa)'
                                                            : 'linear-gradient(to top, #7c3aed, #8b5cf6, #c4b5fd)',
                                                        boxShadow: isHovered ? '0 8px 20px -4px rgba(124,58,237,0.45)' : 'none',
                                                        transformOrigin: 'bottom',
                                                        animation: 'barGrow 0.6s ease-out both',
                                                    }}
                                                >
                                                    <div className="absolute inset-x-0 top-0 h-1.5 bg-white/30 rounded-t-2xl" />
                                                </div>
                                            </div>

                                            {/* X label */}
                                            <div className="mt-3 text-xs font-bold transition-colors duration-200"
                                                style={{ color: isHovered ? '#7c3aed' : '#64748b' }}>
                                                {item.yearTh}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* Empty / single-year fallback */
                        <div className="flex-1 mt-2 flex items-end justify-center h-60 pb-0">
                            <div className="flex flex-col items-center w-28 h-full justify-end">
                                <span className="mb-2 text-xs font-bold text-white px-3 py-1 rounded-xl"
                                    style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                                    ฿{yearlyExpenseTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </span>
                                <div className="w-full h-44 flex items-end">
                                    <div className="w-full rounded-t-2xl h-3/4"
                                        style={{ background: 'linear-gradient(to top, #7c3aed, #c4b5fd)' }} />
                                </div>
                                <div className="mt-3 text-xs font-bold text-slate-500">ปี {new Date().getFullYear() + 543}</div>
                            </div>
                        </div>
                    )}

                </div>

                {/* ── Donut Chart (5 cols) ── */}
                <div
                    className="lg:col-span-5 bg-white rounded-3xl p-6 md:p-8 border border-slate-100 flex flex-col"
                    style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', animation: 'fadeSlideUp 0.5s ease-out 0.32s both' }}
                >
                    <SectionHeader
                        icon={PieChart}
                        iconGradient="linear-gradient(135deg,#10b981,#059669)"
                        iconShadow="0 4px 12px -2px rgba(16,185,129,0.35)"
                        title="อัตราความพร้อมยานพาหนะ"
                        subtitle="สัดส่วนสถานะยานพาหนะในระบบ"
                        rightSlot={
                            <span className={clsx(
                                'px-3 py-1 rounded-full text-xs font-bold border',
                                isHealthy ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            )}>
                                {isHealthy ? '✓ สมบูรณ์ดี' : '⚠ เฝ้าระวัง'}
                            </span>
                        }
                    />

                    {/* SVG Donut */}
                    <div className="flex flex-col items-center my-4">
                        <div className="relative w-44 h-44">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                {/* Track */}
                                <circle cx="60" cy="60" r={radius} fill="transparent"
                                    stroke="#fee2e2" strokeWidth="13" />
                                {/* Emerald arc — ready */}
                                <circle cx="60" cy="60" r={radius} fill="transparent"
                                    stroke="#10b981" strokeWidth="13"
                                    strokeDasharray={`${readyStroke} ${circ}`}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
                                />
                            </svg>
                            {/* Center text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">{availabilityRate}%</span>
                                <span className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">พร้อมใช้งาน</span>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="w-full mt-5 rounded-2xl border border-slate-100 overflow-hidden"
                            style={{ background: '#f8fafc' }}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                                    <span className="text-xs font-semibold text-slate-700">พร้อมใช้งาน (Ready)</span>
                                </div>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                                    {readyVehicles} คัน · {availabilityRate}%
                                </span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-rose-400 flex-shrink-0" />
                                    <span className="text-xs font-semibold text-slate-700">ซ่อมบำรุง / ไม่พร้อมใช้</span>
                                </div>
                                <span className="text-xs font-bold text-rose-600 bg-rose-100/70 px-2 py-0.5 rounded-md">
                                    {unavailableVehicles} คัน · {100 - availabilityRate}%
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <span className="font-medium text-slate-500">รวมยานพาหนะทั้งสิ้น</span>
                        <span className="font-extrabold text-slate-700">{totalVehicles} คัน</span>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════
                TOP-5 VEHICLE TABLE
            ══════════════════════════════════════════ */}
            <div
                className="bg-white rounded-3xl border border-slate-100 overflow-hidden"
                style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', animation: 'fadeSlideUp 0.5s ease-out 0.4s both' }}
            >
                {/* Table Header */}
                <div className="px-6 md:px-8 py-5 flex flex-wrap items-center justify-between gap-3"
                    style={{ borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(to right, #faf5ff, #f8fafc)' }}>
                    <div>
                        <h2 className="text-base font-bold text-slate-800">
                            5 อันดับยานพาหนะค่าซ่อมสูงสุดปีนี้
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">จัดอันดับจากยอดรวมรายจ่ายการซ่อมบำรุงที่อนุมัติแล้ว</p>
                    </div>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-100">
                    {!topVehicles.length && (
                        <p className="text-center py-10 text-slate-400 text-sm">ยังไม่มีข้อมูลค่าซ่อมบำรุง</p>
                    )}
                    {topVehicles.map((tv, i) => (
                        <div key={tv.vehicle?.vehicle_id || tv.vehicle?.id || i}
                            onClick={() => setSelectedVehicleId(tv.vehicle?.vehicle_id || tv.vehicle?.id)}
                            className="p-4 flex items-center gap-3 hover:bg-violet-50/60 transition-colors cursor-pointer group">
                            <RankBadge rank={i} />
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 text-sm">{tv.vehicle?.license_plate || 'ไม่ระบุ'}</p>
                                <p className="text-xs text-slate-500">{tv.vehicle?.brand} {tv.vehicle?.model}</p>
                                <p className="text-xs text-slate-400">{tv.vehicle?.driver?.full_name || '—'}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="font-extrabold text-sm" style={{ color: '#7c3aed' }}>
                                    ฿{(tv.totalCost || 0).toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                                </p>
                                <span className="text-xs font-semibold bg-violet-50 text-violet-600 border border-violet-100 px-2 py-0.5 rounded-full">
                                    {tv.repairCount} ครั้ง
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead style={{ background: '#faf5ff', borderBottom: '1px solid #f1f5f9' }}>
                            <tr>
                                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">อันดับ</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">ทะเบียนรถ / รุ่น</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">ผู้รับผิดชอบ</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">ครั้งซ่อม</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">ค่าซ่อมรวม (บาท)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {!topVehicles.length && (
                                <tr><td colSpan={5} className="text-center py-10 text-slate-400">ยังไม่มีข้อมูลค่าซ่อมบำรุง</td></tr>
                            )}
                            {topVehicles.map((tv, i) => (
                                <tr key={tv.vehicle?.vehicle_id || tv.vehicle?.id || i}
                                    onClick={() => setSelectedVehicleId(tv.vehicle?.vehicle_id || tv.vehicle?.id)}
                                    className="transition-colors duration-150 cursor-pointer hover:bg-violet-50/40 group"
                                >
                                    <td className="px-6 py-4 text-center">
                                        <RankBadge rank={i} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{tv.vehicle?.license_plate || 'ไม่ระบุ'}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">{tv.vehicle?.brand} {tv.vehicle?.model}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 text-sm">
                                        {tv.vehicle?.driver?.full_name || tv.vehicle?.driver?.fullName || '—'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-violet-50 text-violet-600 border border-violet-100 px-3 py-1 rounded-full text-xs font-semibold">
                                            {tv.repairCount} ครั้ง
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-extrabold" style={{ color: '#7c3aed' }}>
                                            ฿{(tv.totalCost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedVehicleId && (
                <VehicleExpenseModal
                    vehicleId={selectedVehicleId}
                    onClose={() => setSelectedVehicleId(null)}
                />
            )}
        </div>
    );
}
