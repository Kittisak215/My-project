import { useEffect, useState, useCallback } from 'react';
import {
    Search, Download, Printer, RotateCcw,
    TrendingUp, Calendar, Car, FileText, ChevronLeft, ChevronRight,
    Wrench, AlertTriangle, CheckCircle2, ShieldCheck, DollarSign
} from 'lucide-react';
import api from '../../lib/axios';
import { toast } from 'react-toastify';
import clsx from 'clsx';

/* ─── Animation Keyframes ─── */
const ANIM_STYLE = `
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulseRing {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50%       { transform: scale(1.5); opacity: 0; }
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

/* ─── Category Badge & Label Helpers ─── */
const categoryMap = {
    GENERAL: { label: 'ซ่อมทั่วไป', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    MAINTENANCE: { label: 'บำรุงรักษาตามระยะ', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    EMERGENCY: { label: 'ซ่อมฉุกเฉิน', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
};

function getCategoryBadge(type) {
    const item = categoryMap[type] || { label: type || 'ทั่วไป', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    return (
        <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-semibold border inline-block', item.bg)}>
            {item.label}
        </span>
    );
}

export default function ExpenseReportPage() {
    injectStyle('expense-report-anim', ANIM_STYLE);

    const [data, setData] = useState({ data: [], totalAmount: 0, avgAmount: 0, maxAmount: 0, total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [vehicles, setVehicles] = useState([]);
    const [page, setPage] = useState(1);

    const [filters, setFilters] = useState({
        from: '',
        to: '',
        vehicleId: 'all',
        category: 'all',
    });

    const [activePreset, setActivePreset] = useState('all');

    // Fetch vehicles for dropdown
    useEffect(() => {
        api.get('/vehicles', { params: { limit: 100 } })
            .then(res => {
                const list = res.data?.data || res.data || [];
                setVehicles(list);
            })
            .catch(() => {});
    }, []);

    // Main fetch data function
    const fetchData = useCallback(async (targetPage = 1, currentFilters = filters) => {
        setLoading(true);
        try {
            const res = await api.get('/reports/expense', {
                params: {
                    from: currentFilters.from || undefined,
                    to: currentFilters.to || undefined,
                    vehicleId: currentFilters.vehicleId !== 'all' ? currentFilters.vehicleId : undefined,
                    category: currentFilters.category !== 'all' ? currentFilters.category : undefined,
                    page: targetPage,
                    limit: 10,
                }
            });
            setData(res.data);
            setPage(targetPage);
        } catch {
            toast.error('ไม่สามารถโหลดข้อมูลรายงานได้');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData(1);
    }, []);

    // Quick Date Presets
    const handlePreset = (preset) => {
        setActivePreset(preset);
        const now = new Date();
        let newFrom = '';
        let newTo = '';

        if (preset === 'thisMonth') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            newFrom = firstDay.toISOString().split('T')[0];
            newTo = lastDay.toISOString().split('T')[0];
        } else if (preset === 'last3Months') {
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            newFrom = threeMonthsAgo.toISOString().split('T')[0];
            newTo = now.toISOString().split('T')[0];
        } else if (preset === 'thisYear') {
            const firstDayYear = new Date(now.getFullYear(), 0, 1);
            const lastDayYear = new Date(now.getFullYear(), 11, 31);
            newFrom = firstDayYear.toISOString().split('T')[0];
            newTo = lastDayYear.toISOString().split('T')[0];
        }

        const updated = { ...filters, from: newFrom, to: newTo };
        setFilters(updated);
        fetchData(1, updated);
    };

    // Reset filters
    const handleReset = () => {
        const resetFilters = { from: '', to: '', vehicleId: 'all', category: 'all' };
        setFilters(resetFilters);
        setActivePreset('all');
        fetchData(1, resetFilters);
    };

    // Search trigger
    const handleSearch = (e) => {
        e?.preventDefault();
        setActivePreset('custom');
        fetchData(1);
    };

    // Export CSV
    const handleExportCSV = async () => {
        setExporting(true);
        try {
            const res = await api.get('/reports/expense', {
                params: {
                    from: filters.from || undefined,
                    to: filters.to || undefined,
                    vehicleId: filters.vehicleId !== 'all' ? filters.vehicleId : undefined,
                    category: filters.category !== 'all' ? filters.category : undefined,
                    exportAll: 'true',
                }
            });

            const rows = res.data?.data || [];
            if (!rows.length) {
                toast.warning('ไม่พบข้อมูลที่จะส่งออก');
                setExporting(false);
                return;
            }

            // Generate CSV content with UTF-8 BOM
            const headers = ['วันที่', 'เลขที่คำร้อง', 'ทะเบียนรถ', 'ยี่ห้อ/รุ่น', 'ผู้รับผิดชอบ', 'หมวดหมู่', 'รายละเอียด', 'ศูนย์บริการ/อู่', 'ยอดเงิน (บาท)'];
            const csvRows = [headers.join(',')];

            rows.forEach(r => {
                const dateStr = (r.repair_end_date || r.request_date || r.created_at)
                    ? new Date(r.repair_end_date || r.request_date || r.created_at).toLocaleDateString('th-TH')
                    : '-';
                const code = `REQ-${String(r.request_id).padStart(4, '0')}`;
                const plate = `"${(r.vehicle?.license_plate || '-').replace(/"/g, '""')}"`;
                const brand = `"${(`${r.vehicle?.brand || ''} ${r.vehicle?.model || ''}`).trim() || '-'}"`;
                const driver = `"${(r.vehicle?.driver?.full_name || r.driver?.full_name || '-').replace(/"/g, '""')}"`;
                const category = `"${categoryMap[r.repair_type]?.label || r.repair_type || 'ทั่วไป'}"`;
                const desc = `"${(r.issue_description || r.repair_detail || r.description || '-').replace(/"/g, '""')}"`;
                const garage = `"${(r.garage?.garage_name || '-').replace(/"/g, '""')}"`;
                const cost = Number(r.total_cost) || 0;

                csvRows.push([dateStr, code, plate, brand, driver, category, desc, garage, cost].join(','));
            });

            const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `expense_report_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('ส่งออกไฟล์ CSV เรียบร้อยแล้ว');
        } catch {
            toast.error('ไม่สามารถส่งออกไฟล์ได้');
        } finally {
            setExporting(false);
        }
    };

    // Print Report
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6 pb-12">

            {/* ══════════════════════════════════════════
                COMMAND BANNER
            ══════════════════════════════════════════ */}
            <div
                className="relative overflow-hidden rounded-3xl text-white p-6 md:p-8"
                style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #2d1b69 75%, #1e1b4b 100%)',
                    boxShadow: '0 20px 40px -8px rgba(15,23,42,0.4)',
                    animation: 'fadeSlideUp 0.45s ease-out both',
                }}
            >
                <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)' }} />
                <div className="pointer-events-none absolute -bottom-16 -left-10 w-56 h-56 rounded-full opacity-15"
                    style={{ background: 'radial-gradient(circle, #4f46e5, transparent 70%)' }} />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(167,139,250,0.3)' }}>
                            <ShieldCheck size={13} className="text-violet-300" />
                            <span className="text-violet-200">Executive Report</span>
                            <span className="relative flex h-2 w-2 ml-0.5">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
                                    style={{ animation: 'pulseRing 1.8s ease-out infinite' }} />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                            </span>
                            <span className="text-emerald-300 ml-0.5">Live Data</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">รายงานสรุปค่าใช้จ่ายการซ่อมบำรุง</h1>
                        <p className="text-sm text-slate-300 mt-1.5 max-w-xl">
                            สรุปและวิเคราะห์ค่าใช้จ่ายการซ่อมบำรุงยานพาหนะตามช่วงเวลา ยานพาหนะ และหมวดหมู่จากฐานข้อมูลจริง
                        </p>
                    </div>

                    {/* Quick export/print buttons */}
                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                        <button
                            onClick={handleExportCSV}
                            disabled={exporting}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
                            style={{
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                boxShadow: '0 4px 12px -2px rgba(16,185,129,0.4)',
                            }}
                        >
                            <Download size={16} />
                            {exporting ? 'กำลังส่งออก...' : 'ส่งออก CSV (Excel)'}
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all duration-200"
                        >
                            <Printer size={16} />
                            พิมพ์รายงาน
                        </button>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════
                INTERACTIVE FILTER CARD
            ══════════════════════════════════════════ */}
            <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-sm space-y-4">
                {/* Date presets strip */}
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <Calendar size={14} className="text-violet-600" />
                        <span>ช่วงเวลาด่วน:</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                            { key: 'all', label: 'ทั้งหมด' },
                            { key: 'thisMonth', label: 'เดือนนี้' },
                            { key: 'last3Months', label: '3 เดือนล่าสุด' },
                            { key: 'thisYear', label: `ปีนี้ (${new Date().getFullYear() + 543})` },
                        ].map(p => (
                            <button
                                key={p.key}
                                onClick={() => handlePreset(p.key)}
                                className={clsx(
                                    'px-3 py-1 rounded-xl text-xs font-semibold transition-all duration-200',
                                    activePreset === p.key
                                        ? 'bg-violet-600 text-white shadow-sm'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filter Inputs Grid */}
                <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">ตั้งแต่วันที่</label>
                        <input
                            type="date"
                            value={filters.from}
                            onChange={e => {
                                setFilters(f => ({ ...f, from: e.target.value }));
                                setActivePreset('custom');
                            }}
                            className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">ถึงวันที่</label>
                        <input
                            type="date"
                            value={filters.to}
                            onChange={e => {
                                setFilters(f => ({ ...f, to: e.target.value }));
                                setActivePreset('custom');
                            }}
                            className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">ยานพาหนะ</label>
                        <select
                            value={filters.vehicleId}
                            onChange={e => setFilters(f => ({ ...f, vehicleId: e.target.value }))}
                            className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-colors bg-white"
                        >
                            <option value="all">🚗 รถทุกคันในระบบ</option>
                            {vehicles.map(v => (
                                <option key={v.vehicle_id || v.id} value={v.vehicle_id || v.id}>
                                    {v.license_plate} {v.brand ? `(${v.brand} ${v.model || ''})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">หมวดหมู่การซ่อม</label>
                        <select
                            value={filters.category}
                            onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                            className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-colors bg-white"
                        >
                            <option value="all">📂 ทุกหมวดหมู่</option>
                            <option value="GENERAL">ซ่อมทั่วไป (General)</option>
                            <option value="MAINTENANCE">บำรุงรักษาตามระยะ (Maintenance)</option>
                            <option value="EMERGENCY">ซ่อมฉุกเฉิน (Emergency)</option>
                        </select>
                    </div>

                    {/* Filter Actions */}
                    <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-end gap-2.5 pt-2">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                        >
                            <RotateCcw size={14} />
                            ล้างตัวกรอง
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs md:text-sm font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95"
                            style={{
                                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                                boxShadow: '0 4px 12px -2px rgba(124,58,237,0.4)',
                            }}
                        >
                            <Search size={15} />
                            ค้นหาข้อมูล
                        </button>
                    </div>
                </form>
            </div>

            {/* ══════════════════════════════════════════
                SUMMARY STATS STRIP
            ══════════════════════════════════════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                    className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group"
                    style={{ animation: 'fadeSlideUp 0.5s ease-out 0.1s both' }}
                >
                    <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-rose-500" />
                    <div className="pl-3 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">ยอดรวมค่าใช้จ่าย</p>
                            <h3 className="text-2xl font-extrabold text-rose-600">
                                ฿{(data.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">จากรายการที่อนุมัติแล้ว</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 shrink-0">
                            <TrendingUp size={22} />
                        </div>
                    </div>
                </div>

                <div
                    className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group"
                    style={{ animation: 'fadeSlideUp 0.5s ease-out 0.15s both' }}
                >
                    <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-violet-500" />
                    <div className="pl-3 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">จำนวนรายการซ่อม</p>
                            <h3 className="text-2xl font-extrabold text-slate-800">
                                {data.total || 0} <span className="text-sm font-medium text-slate-400">รายการ</span>
                            </h3>
                            <p className="text-xs text-violet-600 font-medium mt-1">เฉลี่ย ฿{(data.avgAmount || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })} / รายการ</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-violet-50 text-violet-600 shrink-0">
                            <FileText size={22} />
                        </div>
                    </div>
                </div>

                <div
                    className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group"
                    style={{ animation: 'fadeSlideUp 0.5s ease-out 0.2s both' }}
                >
                    <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-blue-500" />
                    <div className="pl-3 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">ค่าเฉลี่ยต่อรายการ</p>
                            <h3 className="text-2xl font-extrabold text-slate-800">
                                ฿{(data.avgAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">มูลค่าเฉลี่ยต่อการซ่อม</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 shrink-0">
                            <DollarSign size={22} />
                        </div>
                    </div>
                </div>

                <div
                    className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group"
                    style={{ animation: 'fadeSlideUp 0.5s ease-out 0.25s both' }}
                >
                    <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-emerald-500" />
                    <div className="pl-3 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">ค่าใช้จ่ายสูงสุดต่อครั้ง</p>
                            <h3 className="text-2xl font-extrabold text-emerald-600">
                                ฿{(data.maxAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                            <p className="text-xs text-emerald-600 font-medium mt-1">ยอดต่อบิลสูงสุด</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
                            <CheckCircle2 size={22} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════
                CATEGORY BREAKDOWN (IF AVAILABLE)
            ══════════════════════════════════════════ */}
            {data.categoryBreakdown && data.categoryBreakdown.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {data.categoryBreakdown.map(cat => {
                        const info = categoryMap[cat.type] || { label: cat.type, bg: 'bg-slate-50' };
                        return (
                            <div key={cat.type} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-semibold text-slate-400 block mb-0.5">{info.label}</span>
                                    <span className="text-lg font-bold text-slate-800">
                                        ฿{cat.totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-violet-50 text-violet-700 border border-violet-100">
                                    {cat.count} ครั้ง
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ══════════════════════════════════════════
                REPORT TABLE & LIST
            ══════════════════════════════════════════ */}
            <div
                className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm"
                style={{ animation: 'fadeSlideUp 0.5s ease-out 0.3s both' }}
            >
                {/* Table Header Strip */}
                <div className="px-6 py-5 flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 bg-linear-to-r from-violet-50/50 to-slate-50">
                    <div>
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-violet-100">
                                <Wrench size={14} className="text-violet-600" />
                            </span>
                            รายการค่าใช้จ่ายการซ่อมบำรุง
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            แสดง {data.data?.length || 0} จากทั้งหมด {data.total || 0} รายการ
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-3 py-1 rounded-full">
                            หน้า {page} / {data.totalPages || 1}
                        </span>
                    </div>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-100">
                    {loading && (
                        <p className="text-center py-12 text-slate-400 text-sm animate-pulse">กำลังโหลดข้อมูล...</p>
                    )}
                    {!loading && (!data.data || data.data.length === 0) && (
                        <div className="flex flex-col items-center py-12 gap-3">
                            <AlertTriangle size={32} className="text-slate-300" />
                            <p className="text-slate-500 font-medium text-sm">ไม่พบรายการค่าใช้จ่ายตามเงื่อนไข</p>
                            <button onClick={handleReset} className="text-xs text-violet-600 font-semibold underline">
                                ล้างตัวกรองทั้งหมด
                            </button>
                        </div>
                    )}
                    {data.data?.map(r => {
                        const dateStr = (r.repair_end_date || r.request_date || r.created_at)
                            ? new Date(r.repair_end_date || r.request_date || r.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
                            : '-';
                        const desc = r.issue_description || r.repair_detail || r.description || '-';
                        return (
                            <div key={r.request_id || r.id} className="p-4 hover:bg-violet-50/20 transition-colors space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">
                                        REQ-{String(r.request_id).padStart(4, '0')}
                                    </span>
                                    <span className="text-xs text-slate-400">{dateStr}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{r.vehicle?.license_plate}</p>
                                        <p className="text-xs text-slate-400">{r.vehicle?.brand} {r.vehicle?.model}</p>
                                    </div>
                                    <p className="text-base font-extrabold text-rose-600">
                                        ฿{(Number(r.total_cost) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                    {getCategoryBadge(r.repair_type)}
                                    <span className="text-xs text-slate-500 truncate max-w-45">
                                        {r.garage?.garage_name || '-'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded-lg">
                                    {desc}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Desktop Table (Optimized for Screen Fit) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead style={{ background: '#faf5ff', borderBottom: '1px solid #f1f5f9' }}>
                            <tr>
                                <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 w-32">
                                    วันที่ / เลขคำร้อง
                                </th>
                                <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 w-44">
                                    ยานพาหนะ / ผู้รับผิดชอบ
                                </th>
                                <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 w-32 text-center">
                                    หมวดหมู่
                                </th>
                                <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                                    รายละเอียด / ศูนย์บริการ-อู่
                                </th>
                                <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500 w-36">
                                    ยอดเงิน (บาท)
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-slate-400 text-sm animate-pulse">
                                        กำลังโหลดข้อมูลรายงาน...
                                    </td>
                                </tr>
                            )}
                            {!loading && (!data.data || data.data.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-2">
                                            <AlertTriangle size={28} className="text-slate-300" />
                                            <p className="text-slate-500 font-medium text-sm">ไม่พบรายการค่าใช้จ่ายตามเงื่อนไขที่เลือก</p>
                                            <button onClick={handleReset} className="text-xs text-violet-600 font-semibold underline">
                                                ล้างตัวกรองทั้งหมด
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {data.data?.map(r => {
                                const dateStr = (r.repair_end_date || r.request_date || r.created_at)
                                    ? new Date(r.repair_end_date || r.request_date || r.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
                                    : '-';
                                const desc = r.issue_description || r.repair_detail || r.description || '-';
                                const driverName = r.vehicle?.driver?.full_name || r.driver?.full_name || '—';
                                const garageName = r.garage?.garage_name || '—';

                                return (
                                    <tr
                                        key={r.request_id || r.id}
                                        className="transition-colors duration-150 hover:bg-violet-50/30"
                                    >
                                        {/* 1. Date & REQ Code */}
                                        <td className="px-4 py-3.5 align-top">
                                            <span className="font-bold text-violet-700 text-xs bg-violet-50 px-2 py-0.5 rounded-md inline-block mb-1 border border-violet-100">
                                                REQ-{String(r.request_id).padStart(4, '0')}
                                            </span>
                                            <div className="text-xs text-slate-500">{dateStr}</div>
                                        </td>

                                        {/* 2. Vehicle & Driver */}
                                        <td className="px-4 py-3.5 align-top">
                                            <div className="font-bold text-slate-800 text-sm">{r.vehicle?.license_plate || '-'}</div>
                                            <div className="text-xs text-slate-400 font-medium">{r.vehicle?.brand} {r.vehicle?.model}</div>
                                            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                                <span className="text-slate-400">ผู้ขับ:</span> {driverName}
                                            </div>
                                        </td>

                                        {/* 3. Category */}
                                        <td className="px-4 py-3.5 align-top text-center">
                                            {getCategoryBadge(r.repair_type)}
                                        </td>

                                        {/* 4. Description & Garage */}
                                        <td className="px-4 py-3.5 align-top">
                                            <p className="text-xs text-slate-700 leading-relaxed font-medium line-clamp-2" title={desc}>
                                                {desc}
                                            </p>
                                            <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                                                <span className="font-semibold text-slate-500">อู่/ศูนย์:</span> {garageName}
                                            </div>
                                        </td>

                                        {/* 5. Cost */}
                                        <td className="px-4 py-3.5 align-top text-right">
                                            <div className="text-base font-extrabold text-slate-800">
                                                ฿{(Number(r.total_cost) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {!loading && data.data && data.data.length > 0 && (
                            <tfoot>
                                <tr className="bg-violet-50/60 border-t-2 border-violet-200">
                                    <td colSpan={4} className="px-4 py-4 text-right font-extrabold text-slate-700">
                                        ยอดรวมทั้งหมดในหน้านี้ / ตามตัวกรอง:
                                    </td>
                                    <td className="px-4 py-4 text-right font-black text-rose-600 text-lg">
                                        ฿{(data.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {/* ══════════════════════════════════════════
                    PAGINATION FOOTER
                ══════════════════════════════════════════ */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/50">
                    <p className="text-xs text-slate-500">
                        แสดง <span className="font-bold text-slate-700">{data.data?.length ? (page - 1) * 10 + 1 : 0}</span> ถึง <span className="font-bold text-slate-700">{Math.min(page * 10, data.total || 0)}</span> จากทั้งหมด <span className="font-bold text-slate-700">{data.total || 0}</span> รายการ
                    </p>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => fetchData(page - 1)}
                            disabled={page <= 1 || loading}
                            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        {Array.from({ length: data.totalPages || 1 }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === data.totalPages || Math.abs(p - page) <= 1)
                            .map((p, idx, arr) => {
                                const prev = arr[idx - 1];
                                return (
                                    <div key={p} className="flex items-center">
                                        {prev && p - prev > 1 && <span className="px-1 text-slate-400 text-xs">…</span>}
                                        <button
                                            onClick={() => fetchData(p)}
                                            className={clsx(
                                                'w-8 h-8 rounded-xl text-xs font-bold transition-all duration-150',
                                                page === p
                                                    ? 'bg-violet-600 text-white shadow-sm'
                                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                            )}
                                        >
                                            {p}
                                        </button>
                                    </div>
                                );
                            })}

                        <button
                            onClick={() => fetchData(page + 1)}
                            disabled={page >= (data.totalPages || 1) || loading}
                            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

