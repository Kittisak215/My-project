import { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import api from '../../lib/axios';
import { toast } from 'react-toastify';

export default function ApprovalsPage() {
    const [data, setData] = useState({ data: [], totalAmount: 0 });
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try { const res = await api.get('/reports/approvals'); setData(res.data); }
        catch { toast.error('โหลดข้อมูลไม่สำเร็จ'); }
        setLoading(false);
    };
    useEffect(() => { fetchData(); }, []);

    const handleDecision = async (id, approved) => {
        const note = approved ? 'อนุมัติโดยผู้บริหาร' : window.prompt('กรุณาระบุเหตุผลที่ไม่อนุมัติ:');
        if (!approved && !note) return;
        setProcessing(id);
        try {
            await api.patch(`/repairs/${id}/approve`, { approved, note });
            toast.success(approved ? '✅ อนุมัติสำเร็จ' : '❌ ไม่อนุมัติเรียบร้อย');
            fetchData();
        } catch { toast.error('เกิดข้อผิดพลาด'); }
        setProcessing(null);
    };

    return (
        <div>
            <h1 className="text-2xl font-semibold text-slate-800 mb-6">อนุมัติการซ่อม (งบพิเศษ)</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-200">
                    <p className="text-sm text-slate-500 font-medium">รอการอนุมัติ</p>
                    <p className="text-3xl font-bold text-amber-600">{data.data?.length || 0} <span className="text-sm font-normal text-slate-500">รายการ</span></p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-200">
                    <p className="text-sm text-slate-500 font-medium">มูลค่าที่รออนุมัติ</p>
                    <p className="text-3xl font-bold text-red-600">{(data.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-sm font-normal text-slate-500">บาท</span></p>
                </div>
            </div>

            {loading && <div className="text-center text-slate-400 py-8">กำลังโหลด...</div>}
            {!loading && data.data?.length === 0 && (
                <div className="bg-white rounded-xl p-12 text-center border border-slate-200 text-slate-400">ไม่มีรายการรออนุมัติ</div>
            )}

            <div className="space-y-4">
                {data.data?.map(r => (
                    <div key={r.request_id || r.id} className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="bg-purple-100 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full text-xs font-medium">⏳ รออนุมัติ</span>
                                    <span className="font-bold text-blue-600">REQ-{String(r.request_id).padStart(4, '0')}</span>
                                    <span className="text-slate-400 text-sm">{new Date(r.created_at || r.createdAt).toLocaleDateString('th-TH')}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">ยานพาหนะ</p>
                                        <p className="font-semibold text-slate-800">{r.vehicle?.license_plate}</p>
                                        <p className="text-sm text-slate-500">{r.vehicle?.brand} {r.vehicle?.model}</p>
                                        <p className="text-sm text-slate-500">ผู้ขับ: {r.vehicle?.driver?.full_name || r.vehicle?.driver?.fullName || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">รายละเอียด</p>
                                        <p className="font-medium text-slate-700">{r.issue_description}</p>
                                        {r.garage && <p className="text-sm text-slate-500 mt-1">อู่: {r.garage.garage_name || r.garage.name}</p>}
                                    </div>
                                </div>
                                <div className="mt-3 bg-slate-50 p-3 rounded-lg">
                                    <p className="text-sm text-slate-500">ค่าใช้จ่ายที่ขออนุมัติ</p>
                                    <p className="text-2xl font-bold text-red-600">{(r.total_cost || r.estimatedCost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 min-w-32">
                                <button disabled={processing === (r.request_id || r.id)} onClick={() => handleDecision(r.request_id || r.id, true)}
                                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                                    <CheckCircle size={16} /> อนุมัติ
                                </button>
                                <button disabled={processing === (r.request_id || r.id)} onClick={() => handleDecision(r.request_id || r.id, false)}
                                    className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                                    <XCircle size={16} /> ไม่อนุมัติ
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
