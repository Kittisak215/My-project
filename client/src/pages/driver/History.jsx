import { useEffect, useState } from 'react';
import api from '../../lib/axios';
import { toast } from 'react-toastify';
import clsx from 'clsx';

export default function DriverHistoryPage() {
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);

    const fetchRepairs = async (p = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/repairs', { params: { page: p, limit: 10 } });
            setRepairs(res.data.data); setTotal(res.data.total); setPage(p);
        } catch { toast.error('โหลดข้อมูลไม่สำเร็จ'); }
        setLoading(false);
    };

    useEffect(() => { fetchRepairs(); }, []);

    const getStatusInfo = (status) => {
        const map = {
            PENDING: { label: '📝 รอตรวจสอบ', cls: 'bg-amber-100 text-amber-700' },
            IN_PROGRESS: { label: '🔧 กำลังซ่อม', cls: 'bg-blue-100 text-blue-700' },
            AWAITING_APPROVAL: { label: '⏳ รออนุมัติ', cls: 'bg-purple-100 text-purple-700' },
            APPROVED: { label: '✅ อนุมัติแล้ว', cls: 'bg-green-100 text-green-700' },
            COMPLETED: { label: '✅ เสร็จสิ้น', cls: 'bg-green-100 text-green-700' },
            REJECTED: { label: '❌ ไม่อนุมัติ', cls: 'bg-red-100 text-red-700' },
        };
        return map[status] || { label: status, cls: 'bg-slate-100 text-slate-600' };
    };

    const totalPages = Math.ceil(total / 10);

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">📋 ประวัติการซ่อม</h1>
            {loading && <div className="text-center text-slate-400 py-8">กำลังโหลด...</div>}
            {!loading && repairs.length === 0 && (
                <div className="bg-white rounded-xl p-12 text-center text-slate-400 border border-slate-200">ยังไม่มีประวัติการซ่อม</div>
            )}
            <div className="space-y-4">
                {repairs.map(r => {
                    const si = getStatusInfo(r.status);
                    return (
                        <div key={r.request_id || r.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', si.cls)}>{si.label}</span>
                                        <span className="text-sm font-bold text-blue-600">REQ-{String(r.request_id).padStart(4, '0')}</span>
                                        <span className="text-xs text-slate-400">{new Date(r.created_at || r.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                    </div>
                                    <p className="font-semibold text-slate-800">{r.vehicle?.license_plate}</p>
                                    <p className="text-sm text-slate-600 mt-1">{r.issue_description}</p>
                                    {r.garage && <p className="text-xs text-slate-500 mt-1">📍 อู่: {r.garage.garage_name || r.garage.name}</p>}
                                    {(r.note || r.adminNote) && <p className="text-xs text-slate-500 mt-1 bg-slate-50 px-2 py-1 rounded">📌 หมายเหตุ: {r.note || r.adminNote}</p>}
                                </div>
                                {(r.total_cost || r.actualCost) && (
                                    <div className="text-right sm:text-right">
                                        <p className="text-xs text-slate-500">ค่าใช้จ่าย</p>
                                        <p className="font-bold text-slate-800">{(r.total_cost || r.actualCost).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    <button disabled={page === 1} onClick={() => fetchRepairs(page - 1)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:opacity-50">ก่อนหน้า</button>
                    <span className="text-sm text-slate-600">หน้า {page} / {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => fetchRepairs(page + 1)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:opacity-50">ถัดไป</button>
                </div>
            )}
        </div>
    );
}
