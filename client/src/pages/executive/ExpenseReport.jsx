import { useEffect, useState, useCallback } from 'react';
import {
    Search, Download, Printer, RotateCcw,
    TrendingUp, Calendar, Car, FileText, ChevronLeft, ChevronRight,
    Wrench, AlertTriangle, CheckCircle2, ShieldCheck, DollarSign,
    ChevronDown, FileSpreadsheet, FileOutput
} from 'lucide-react';
import api from '../../lib/axios';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
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
        <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-semibold border inline-block print:bg-transparent print:border-none print:text-black print:p-0 print:font-normal', item.bg)}>
            {item.label}
        </span>
    );
}

export default function ExpenseReportPage() {
    injectStyle('expense-report-anim', ANIM_STYLE);

    const [data, setData] = useState({ data: [], totalAmount: 0, avgAmount: 0, maxAmount: 0, total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
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
                let dateStr = '-';
                const dVal = r.repair_end_date || r.request_date || r.created_at;
                if (dVal) {
                    const d = new Date(dVal);
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    dateStr = `${yyyy}-${mm}-${dd}`;
                }
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
        <div className="space-y-6 pb-12 print:space-y-4 print:pb-0 print:bg-white print:p-4">

            {/* Print Styles */}
            <style type="text/css" media="print">
                {`
                    @page { 
                        size: A4 portrait; 
                        margin: 1.2cm 1cm; /* Removes browser default headers/footers in most browsers */
                    }
                    body { 
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact;
                        font-family: ui-sans-serif, system-ui, sans-serif;
                    }
                `}
            </style>

            {/* ══════════════════════════════════════════
                PRINT HEADER & FORMAL SUMMARY (Visible ONLY on Print)
            ══════════════════════════════════════════ */}
            <div className="hidden print:block text-center pb-4 border-b border-slate-400 mb-6 mt-0">
                <h1 className="text-xl font-bold text-black mb-2 print:font-sans">รายงานสรุปค่าใช้จ่ายการซ่อมบำรุงยานพาหนะ</h1>
                <p className="text-sm text-slate-700 mb-4 print:font-sans print:font-normal">
                    ข้อมูล ณ วันที่: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <div className="text-sm text-slate-800 flex items-center justify-between px-8 print:font-sans print:font-medium">
                    <span>จำนวนรายการซ่อม: {data.total || 0} รายการ</span>
                    <span>ยอดรวมค่าใช้จ่ายทั้งสิ้น: ฿{(data.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    <span>ค่าเฉลี่ยต่อรายการ: ฿{(data.avgAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>

            {/* ══════════════════════════════════════════
                COMMAND BANNER (Hidden on Print)
            ══════════════════════════════════════════ */}
            <div
                className="relative rounded-3xl text-white p-6 md:p-8 print:hidden"
                style={{
                    background: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #3b0764 100%)',
                    boxShadow: '0 10px 30px -10px rgba(124,58,237,0.4)',
                    animation: 'fadeSlideUp 0.45s ease-out both',
                }}
            >
                {/* Ambient glow blobs - Wrapped in overflow-hidden to prevent clipping the dropdown */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                    <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20"
                        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.8), transparent 70%)' }} />
                    <div className="absolute -bottom-16 -left-10 w-56 h-56 rounded-full opacity-20"
                        style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.6), transparent 70%)' }} />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div>
                        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-violet-100 border border-white/20 backdrop-blur-sm">
                            <ShieldCheck size={13} className="text-violet-300" />
                            <span>Executive Report</span>
                            <span className="relative flex h-2 w-2 ml-0.5">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
                                    style={{ animation: 'pulseRing 1.8s ease-out infinite' }} />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                            </span>
                            <span className="text-emerald-300 ml-0.5">Live Data</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                            รายงานสรุปค่าใช้จ่ายการซ่อมบำรุง
                        </h1>
                        <p className="text-sm text-violet-200 mt-1.5 max-w-xl leading-relaxed">
                            สรุปและวิเคราะห์ค่าใช้จ่ายการซ่อมบำรุงยานพาหนะตามช่วงเวลา และยานพาหนะ
                        </p>
                    </div>

                    {/* Quick export/print buttons */}
                    <div className="relative">
                        <button
                            onClick={() => setExportMenuOpen(!exportMenuOpen)}
                            disabled={exporting}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold text-violet-700 bg-white hover:bg-violet-50 transition-all duration-200 shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            <FileOutput size={16} />
                            {exporting ? 'กำลังเตรียมเอกสาร...' : 'ส่งออกข้อมูล (Export)'}
                            <ChevronDown size={14} className={clsx("transition-transform duration-200 ml-1", exportMenuOpen && "rotate-180")} />
                        </button>

                        {/* Dropdown Menu */}
                        {exportMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)}></div>
                                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg shadow-violet-900/10 border border-slate-100 py-2 z-50 overflow-hidden transform origin-top-right transition-all">
                                    <div className="px-4 py-2 border-b border-slate-50">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เลือกรูปแบบไฟล์</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setExportMenuOpen(false);
                                            handlePrint();
                                        }}
                                        className="w-full text-left px-4 py-3 text-xs md:text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                    >
                                        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500">
                                            <Printer size={16} />
                                        </div>
                                        <div>
                                            <p>พิมพ์รายงาน (PDF)</p>
                                            <p className="text-[10px] font-normal text-slate-400 mt-0.5">รูปแบบเอกสารทางการ</p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setExportMenuOpen(false);
                                            handleExportCSV();
                                        }}
                                        className="w-full text-left px-4 py-3 text-xs md:text-sm font-semibold text-slate-700 hover:bg-emerald-50 flex items-center gap-3 transition-colors"
                                    >
                                        <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
                                            <FileSpreadsheet size={16} />
                                        </div>
                                        <div>
                                            <p>ส่งออกเป็น CSV</p>
                                            <p className="text-[10px] font-normal text-slate-400 mt-0.5">สำหรับวิเคราะห์ใน Excel</p>
                                        </div>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════
                INTERACTIVE FILTER CARD
            ══════════════════════════════════════════ */}
            <div className="bg-white rounded-3xl p-4 md:p-5 border border-slate-100 shadow-sm space-y-3 print:hidden">
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
                        <DatePicker
                            selected={filters.from ? new Date(filters.from) : null}
                            onChange={date => {
                                const ymd = date ? date.toLocaleDateString('en-CA') : '';
                                setFilters(f => ({ ...f, from: ymd }));
                                setActivePreset('custom');
                            }}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="วว/ดด/ปปปป"
                            className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">ถึงวันที่</label>
                        <DatePicker
                            selected={filters.to ? new Date(filters.to) : null}
                            onChange={date => {
                                const ymd = date ? date.toLocaleDateString('en-CA') : '';
                                setFilters(f => ({ ...f, to: ymd }));
                                setActivePreset('custom');
                            }}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="วว/ดด/ปปปป"
                            className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">ยานพาหนะ</label>
                        <select
                            value={filters.vehicleId}
                            onChange={e => setFilters(f => ({ ...f, vehicleId: e.target.value }))}
                            className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-colors bg-white"
                        >
                            <option value="all">รถทุกคันในระบบ</option>
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
                            <option value="all">ทุกหมวดหมู่</option>
                            <option value="GENERAL">ซ่อมทั่วไป</option>
                            <option value="EMERGENCY">ซ่อมฉุกเฉิน</option>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
                <div
                    className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-200 print:shadow-none print:border-slate-300 print:break-inside-avoid"
                    style={{ animation: 'fadeSlideUp 0.4s ease-out 0.05s both' }}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">ยอดรวมค่าใช้จ่าย</p>
                            <h3 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                                ฿{(data.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                จากรายการที่อนุมัติแล้ว
                            </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600 shrink-0">
                            <DollarSign size={20} />
                        </div>
                    </div>
                </div>

                <div
                    className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-200 print:shadow-none print:border-slate-300 print:break-inside-avoid"
                    style={{ animation: 'fadeSlideUp 0.4s ease-out 0.1s both' }}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">จำนวนรายการซ่อม</p>
                            <h3 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                                {data.total || 0} <span className="text-sm font-normal text-slate-400">รายการ</span>
                            </h3>
                            <p className="text-xs text-slate-400 mt-1.5">
                                เฉลี่ย ฿{(data.avgAmount || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })} / รายการ
                            </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                            <FileText size={20} />
                        </div>
                    </div>
                </div>

                <div
                    className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-200 print:shadow-none print:border-slate-300 print:break-inside-avoid"
                    style={{ animation: 'fadeSlideUp 0.4s ease-out 0.15s both' }}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">ค่าเฉลี่ยต่อรายการ</p>
                            <h3 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                                ฿{(data.avgAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1.5">มูลค่าเฉลี่ยต่อการซ่อม</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 shrink-0">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                </div>

                <div
                    className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-200 print:shadow-none print:border-slate-300 print:break-inside-avoid"
                    style={{ animation: 'fadeSlideUp 0.4s ease-out 0.2s both' }}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">ค่าใช้จ่ายสูงสุดต่อครั้ง</p>
                            <h3 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                                ฿{(data.maxAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1.5">ยอดต่อบิลสูงสุด</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                            <CheckCircle2 size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════
                CATEGORY BREAKDOWN
            ══════════════════════════════════════════ */}
            {data.categoryBreakdown && data.categoryBreakdown.length > 0 && (
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-violet-600"></span>
                        <span>สัดส่วนตามประเภทการซ่อม:</span>
                    </div>
                    <div className="flex items-center gap-2.5 flex-wrap flex-1 md:justify-end">
                        {data.categoryBreakdown.map(cat => {
                            const info = categoryMap[cat.type] || { label: cat.type };
                            return (
                                <div key={cat.type} className="bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3 text-xs">
                                    <span className="font-medium text-slate-600">{info.label}</span>
                                    <span className="font-bold text-slate-900">฿{cat.totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                    <span className="px-2 py-0.5 rounded-lg bg-violet-50 text-violet-700 text-[11px] font-semibold border border-violet-100/60">
                                        {cat.count} ครั้ง
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                REPORT TABLE & LIST
            ══════════════════════════════════════════ */}
            <div
                className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm print:shadow-none print:border-none print:rounded-none"
                style={{ animation: 'fadeSlideUp 0.5s ease-out 0.3s both' }}
            >
                {/* Table Header Strip */}
                <div className="px-6 py-5 flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 bg-linear-to-r from-violet-50/50 to-slate-50 print:hidden">
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
                <div className="md:hidden divide-y divide-slate-100 print:hidden">
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
                            <div key={r.request_id || r.id} className="p-4 hover:bg-slate-50/60 transition-colors space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-blue-600">
                                        REQ-{String(r.request_id).padStart(4, '0')}
                                    </span>
                                    <span className="text-xs text-slate-400">{dateStr}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{r.vehicle?.license_plate}</p>
                                        <p className="text-xs text-slate-400">{r.vehicle?.brand} {r.vehicle?.model}</p>
                                    </div>
                                    <p className="text-base font-extrabold text-slate-800">
                                        ฿{(Number(r.total_cost) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between pt-0.5">
                                    {getCategoryBadge(r.repair_type)}
                                    <span className="text-xs text-slate-500 truncate max-w-45">
                                        {r.garage?.garage_name ? `📍 ${r.garage.garage_name}` : '—'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100/80">
                                    {desc}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Desktop Table (Optimized for Screen Fit) */}
                <div className="hidden md:block overflow-x-auto print:block">
                    <table className="w-full text-sm text-left print:text-slate-800 print:text-xs print:border-collapse print:font-sans">
                        <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200/80 print:bg-slate-50 print:text-black print:border-b-2 print:border-slate-400">
                            <tr>
                                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 w-36 print:w-auto print:text-black print:font-bold print:py-2 print:px-2 print:border print:border-slate-300">
                                    วันที่ / เลขคำร้อง
                                </th>
                                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 w-48 print:w-auto print:text-black print:font-bold print:py-2 print:px-2 print:border print:border-slate-300">
                                    ยานพาหนะ / ผู้รับผิดชอบ
                                </th>
                                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 w-36 text-center print:w-auto print:text-black print:font-bold print:py-2 print:px-2 print:text-left print:border print:border-slate-300">
                                    หมวดหมู่
                                </th>
                                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 print:w-auto print:text-black print:font-bold print:py-2 print:px-2 print:border print:border-slate-300">
                                    รายละเอียด / ศูนย์บริการ-อู่
                                </th>
                                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 w-40 print:w-auto print:text-black print:font-bold print:py-2 print:px-2 print:border print:border-slate-300">
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
                                        className="transition-colors duration-150 hover:bg-slate-50/70 print:break-inside-avoid print:font-sans print:font-normal"
                                    >
                                        {/* 1. Date & REQ Code */}
                                        <td className="px-5 py-4 align-top print:py-2 print:px-2 print:border print:border-slate-300">
                                            <div className="font-semibold text-blue-600 text-sm print:text-slate-800 print:font-normal print:text-xs">
                                                REQ-{String(r.request_id).padStart(4, '0')}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1 print:text-slate-600">{dateStr}</div>
                                        </td>

                                        {/* 2. Vehicle & Driver */}
                                        <td className="px-5 py-4 align-top print:py-2 print:px-2 print:border print:border-slate-300">
                                            <div className="font-bold text-slate-800 text-sm print:font-normal print:text-xs">{r.vehicle?.license_plate || '-'}</div>
                                            <div className="text-xs text-slate-400 font-medium mt-0.5 print:text-slate-600 print:font-normal">{r.vehicle?.brand} {r.vehicle?.model}</div>
                                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 print:text-slate-600 print:font-normal">
                                                <span className="text-slate-400 print:hidden">ผู้ขับ:</span> {driverName}
                                            </div>
                                        </td>

                                        {/* 3. Category */}
                                        <td className="px-5 py-4 align-top text-center print:py-2 print:px-2 print:text-left print:border print:border-slate-300">
                                            {getCategoryBadge(r.repair_type)}
                                        </td>

                                        {/* 4. Description & Garage */}
                                        <td className="px-5 py-4 align-top print:py-2 print:px-2 print:border print:border-slate-300">
                                            <p className="text-sm text-slate-700 leading-relaxed font-medium line-clamp-2 print:text-slate-800 print:font-normal print:line-clamp-none print:text-xs" title={desc}>
                                                {desc}
                                            </p>
                                            <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1 print:text-slate-600 print:font-normal">
                                                <span className="font-medium text-slate-500 print:hidden">อู่/ศูนย์:</span> {garageName}
                                            </div>
                                        </td>

                                        {/* 5. Cost */}
                                        <td className="px-5 py-4 align-top text-right print:py-2 print:px-2 print:border print:border-slate-300">
                                            <div className="text-base font-extrabold text-slate-800 print:text-slate-900 print:font-semibold print:text-xs">
                                                ฿{(Number(r.total_cost) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {!loading && data.data && data.data.length > 0 && (
                            <tfoot>
                                <tr className="bg-slate-50/70 border-t-2 border-slate-200 print:bg-slate-50 print:border-slate-400 print:border-t-2">
                                    <td colSpan={4} className="px-5 py-4 text-right font-bold text-slate-700 print:text-black print:py-2 print:px-2 print:text-xs print:border print:border-slate-300 print:font-sans">
                                        ยอดรวมทั้งหมดในหน้านี้ / ตามตัวกรอง:
                                    </td>
                                    <td className="px-5 py-4 text-right font-black text-rose-600 text-lg print:text-black print:font-bold print:py-2 print:px-2 print:text-xs print:border print:border-slate-300 print:font-sans">
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
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/50 print:hidden">
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

