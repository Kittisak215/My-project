import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import api from '../../lib/axios';
import { toast } from 'react-toastify';

export default function ExpenseReportPage() {
    const [data, setData] = useState({ data: [], totalAmount: 0, avgAmount: 0, total: 0 });
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ from: '', to: '', vehicleId: 'all', category: 'all' });
    const [vehicles, setVehicles] = useState([]);
    const [page, setPage] = useState(1);

    useEffect(() => {
        api.get('/vehicles', { params: { limit: 100 } }).then(res => setVehicles(res.data.data));
        fetchData();
    }, []);

    const fetchData = async (p = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/reports/expense', { params: { ...filters, page: p, limit: 10 } });
            setData(res.data); setPage(p);
        } catch { toast.error('โหลดข้อมูลไม่สำเร็จ'); }
        setLoading(false);
    };

    return (
        <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-800 mb-4 md:mb-6">รายงานสรุปค่าใช้จ่ายการซ่อมบำรุง</h1>

            {/* Filters */}
            <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 mb-4 md:mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4">
                    <div><label className="text-xs font-medium text-slate-500">ตั้งแต่วันที่</label>
                        <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="mt-1 block w-full h-[38px] border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8A1ABA]" /></div>
                    <div><label className="text-xs font-medium text-slate-500">ถึงวันที่</label>
                        <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="mt-1 block w-full h-[38px] border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8A1ABA]" /></div>
                    <div><label className="text-xs font-medium text-slate-500">ยานพาหนะ</label>
                        <select value={filters.vehicleId} onChange={e => setFilters(f => ({ ...f, vehicleId: e.target.value }))} className="mt-1 block w-full h-[38px] border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
                            <option value="all">รถทุกคัน</option>
                            {vehicles.map(v => <option key={v.vehicle_id || v.id} value={v.vehicle_id || v.id}>{v.license_plate}</option>)}
                        </select></div>
                    <div><label className="text-xs font-medium text-slate-500">หมวดหมู่</label>
                        <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))} className="mt-1 block w-full h-[38px] border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
                            <option value="all">ทุกหมวดหมู่</option>
                            <option value="ซ่อมทั่วไป">ซ่อมทั่วไป</option>
                            <option value="บำรุงรักษาตามระยะ">บำรุงรักษาตามระยะ</option>
                            <option value="ซ่อมฉุกเฉิน">เบิกฉุกเฉิน</option>
                        </select></div>
                </div>
                <button onClick={() => fetchData(1)} className="bg-[#8A1ABA] hover:bg-[#72159c] text-white px-6 py-2 rounded-lg text-sm font-medium w-full sm:w-auto">ค้นหา</button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-6">
                <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-slate-200">
                    <p className="text-xs md:text-sm text-slate-500 font-medium mb-1">ยอดรวมค่าใช้จ่าย</p>
                    <p className="text-2xl md:text-3xl font-bold text-red-600">{(data.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-sm text-slate-500">บาท</span></p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-slate-200">
                    <p className="text-xs md:text-sm text-slate-500 font-medium mb-1">จำนวนรายการ</p>
                    <p className="text-2xl md:text-3xl font-bold text-slate-800">{data.total || 0} <span className="text-sm text-slate-500">รายการ</span></p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-slate-200">
                    <p className="text-xs md:text-sm text-slate-500 font-medium mb-1">ค่าเฉลี่ยต่อรายการ</p>
                    <p className="text-2xl md:text-3xl font-bold text-slate-800">{(data.avgAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-sm text-slate-500">บาท</span></p>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 mb-4">
                {loading && <p className="text-center py-8 text-slate-400">กำลังโหลด...</p>}
                {!loading && data.data?.length === 0 && <p className="text-center py-8 text-slate-400">ไม่มีข้อมูล</p>}
                {data.data?.map(r => (
                    <div key={r.request_id || r.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <span className="font-medium text-blue-600 text-sm">REQ-{String(r.request_id).padStart(4, '0')}</span>
                                <span className="text-xs text-slate-400 ml-2">{(r.repair_end_date || r.created_at) ? new Date(r.repair_end_date || r.created_at).toLocaleDateString('th-TH') : '-'}</span>
                            </div>
                            <p className="font-bold text-slate-800">{(Number(r.total_cost) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.</p>
                        </div>
                        <p className="font-medium text-slate-800">{r.vehicle?.license_plate}</p>
                        <span className="text-xs px-2 py-0.5 rounded border bg-slate-50 text-slate-600 mr-1">{r.repair_type || r.repairType}</span>
                        <p className="text-xs text-slate-500 mt-1">{r.garage?.garage_name || '-'}</p>
                    </div>
                ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-white text-slate-600 border-b border-slate-200"><tr>
                            <th className="px-6 py-4 font-semibold">วันที่</th>
                            <th className="px-6 py-4 font-semibold">เลขที่คำร้อง</th>
                            <th className="px-6 py-4 font-semibold">ยานพาหนะ</th>
                            <th className="px-6 py-4 font-semibold">รายการซ่อม</th>
                            <th className="px-6 py-4 font-semibold">อู่/ผู้รับผิดชอบ</th>
                            <th className="px-6 py-4 font-semibold text-right">ยอดเงิน (บาท)</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && <tr><td colSpan={6} className="text-center py-8 text-slate-400">กำลังโหลด...</td></tr>}
                            {!loading && data.data?.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400">ไม่มีข้อมูล</td></tr>}
                            {data.data?.map(r => (
                                <tr key={r.request_id || r.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-600">{(r.repair_end_date || r.created_at || r.createdAt) ? new Date(r.repair_end_date || r.created_at || r.createdAt).toLocaleDateString('th-TH') : '-'}</td>
                                    <td className="px-6 py-4 font-medium text-blue-600">REQ-{String(r.request_id).padStart(4, '0')}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800">{r.vehicle?.license_plate}</td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs px-2 py-0.5 rounded border bg-slate-50 text-slate-600 mb-1 inline-block">{r.repair_type || r.repairType}</span>
                                        <div className="text-xs text-slate-800">{r.description}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{r.garage?.garage_name || r.garage?.name || '-'}</td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-800">{(Number(r.total_cost) || r.actualCost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                            {!loading && data.data?.length > 0 && (
                                <tr className="bg-slate-100 border-t-2 border-slate-300">
                                    <td colSpan={5} className="px-6 py-4 text-right font-bold text-slate-700">ยอดรวมสุทธิ (Total) :</td>
                                    <td className="px-6 py-4 text-right font-bold text-red-600 text-lg">{(data.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 text-sm text-slate-500 text-right">แสดง {data.data?.length || 0} จากทั้งหมด {data.total || 0} รายการ</div>
            </div>
        </div>
    );
}
