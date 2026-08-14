import { useEffect, useState } from 'react';
import { History, Wrench, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
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
            setRepairs(res.data.data);
            setTotal(res.data.total);
            setPage(p);
        } catch {
            toast.error('โหลดข้อมูลไม่สำเร็จ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        api.get('/repairs', { params: { page: 1, limit: 10 } })
            .then(res => {
                if (isMounted) {
                    setRepairs(res.data.data);
                    setTotal(res.data.total);
                    setPage(1);
                }
            })
            .catch(() => {
                if (isMounted) {
                    toast.error('โหลดข้อมูลไม่สำเร็จ');
                }
            })
            .finally(() => {
                if (isMounted) {
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const getStatusInfo = (status) => {
        const map = {
            PENDING: { label: '📝 รอตรวจสอบ', cls: 'bg-amber-50 text-amber-700 border-amber-200/80' },
            IN_PROGRESS: { label: '🔧 กำลังซ่อม', cls: 'bg-blue-50 text-blue-700 border-blue-200/80' },
            AWAITING_APPROVAL: { label: '⏳ รออนุมัติ', cls: 'bg-purple-50 text-purple-700 border-purple-200/80' },
            APPROVED: { label: '✅ อนุมัติแล้ว', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' },
            COMPLETED: { label: '✅ เสร็จสิ้น', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' },
            REJECTED: { label: '❌ ไม่อนุมัติ', cls: 'bg-rose-50 text-rose-700 border-rose-200/80' },
        };
        return map[status] || { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
    };

    const totalPages = Math.ceil(total / 10);

    return (
        <div className="w-full space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                        <History size={26} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-800">ประวัติการซ่อมบำรุง</h1>
                        <p className="text-xs md:text-sm text-slate-500">ติดตามสถานะและประวัติการส่งซ่อมทั้งหมดของยานพาหนะ</p>
                    </div>
                </div>
                <div className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1.5 rounded-full self-start sm:self-auto">
                    ทั้งหมด {total} รายการ
                </div>
            </div>

            {loading && (
                <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200 shadow-xs">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm font-medium">กำลังโหลดข้อมูลประวัติการซ่อม...</p>
                </div>
            )}

            {!loading && repairs.length === 0 && (
                <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200 shadow-xs">
                    <Wrench size={48} className="mx-auto mb-3 text-slate-300" />
                    <p className="font-semibold text-slate-600">ยังไม่มีประวัติการแจ้งซ่อม</p>
                    <p className="text-xs text-slate-400 mt-1">ประวัติการแจ้งซ่อมทั้งหมดของคุณจะแสดงที่นี่</p>
                </div>
            )}

            {!loading && repairs.length > 0 && (
                <div className="space-y-4">
                    {repairs.map(r => {
                        const si = getStatusInfo(r.status);
                        return (
                            <div key={r.request_id || r.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all p-5 md:p-6">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
                                            <span className={clsx('px-3 py-1 rounded-full text-xs font-bold border', si.cls)}>
                                                {si.label}
                                            </span>
                                            <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                                                REQ-{String(r.request_id).padStart(4, '0')}
                                            </span>
                                            <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto sm:ml-0">
                                                <Calendar size={13} />
                                                {new Date(r.created_at || r.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </span>
                                        </div>

                                        <h3 className="font-bold text-slate-800 text-base mb-1">
                                            {r.vehicle?.license_plate} <span className="text-xs font-normal text-slate-500">({r.vehicle?.brand} {r.vehicle?.model})</span>
                                        </h3>
                                        
                                        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100 mt-2">
                                            {r.issue_description}
                                        </p>

                                        {r.garage && (
                                            <p className="text-xs font-medium text-slate-500 mt-2 flex items-center gap-1">
                                                📍 <span className="font-semibold text-slate-700">อู่บริการ:</span> {r.garage.garage_name || r.garage.name}
                                            </p>
                                        )}

                                        {(r.note || r.adminNote) && (
                                            <div className="text-xs text-slate-600 mt-2 bg-amber-50/70 border border-amber-200/60 p-2.5 rounded-xl">
                                                📌 <strong>หมายเหตุเพิ่มเติม:</strong> {r.note || r.adminNote}
                                            </div>
                                        )}
                                    </div>

                                    {(r.total_cost || r.actualCost) ? (
                                        <div className="sm:text-right shrink-0 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-100">
                                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">ค่าใช้จ่าย</p>
                                            <p className="font-extrabold text-slate-800 text-lg mt-0.5">
                                                ฿{(r.total_cost || r.actualCost).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                    <button
                        disabled={page === 1}
                        onClick={() => fetchRepairs(page - 1)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1 shadow-xs"
                    >
                        <ChevronLeft size={16} /> ก่อนหน้า
                    </button>
                    <span className="text-xs font-bold text-slate-600 bg-white px-3 py-2 rounded-xl border border-slate-200">
                        หน้า {page} / {totalPages}
                    </span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => fetchRepairs(page + 1)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1 shadow-xs"
                    >
                        ถัดไป <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
