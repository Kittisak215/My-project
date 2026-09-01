import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, ExternalLink, ImageOff, Paperclip, Eye, X, Car, MapPin, Calendar, AlertCircle } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import api from '../../lib/axios';
import { toast } from 'react-toastify';

const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all">
            <div className="flex justify-between items-center p-5 md:p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                <button type="button" onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>
            </div>
            <div className="p-5 md:p-6 overflow-y-auto">{children}</div>
        </div>
    </div>
);

export default function ApprovalsPage() {
    const [data, setData] = useState({ data: [], totalAmount: 0 });
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);

    const fetchData = useCallback(async () => {
        try { const res = await api.get('/reports/approvals'); setData(res.data); }
        catch { toast.error('โหลดข้อมูลไม่สำเร็จ'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDecision = async (id, approved) => {
        const note = approved ? 'อนุมัติโดยผู้ดูแลระบบ (Admin)' : window.prompt('กรุณาระบุเหตุผลที่ไม่อนุมัติ:');
        if (!approved && !note) return;
        setProcessing(id);
        try {
            await api.patch(`/repairs/${id}/approve`, { approved, note });
            toast.success(approved ? 'อนุมัติสำเร็จ' : 'ไม่อนุมัติเรียบร้อย');
            setSelectedRequest(null);
            fetchData();
        } catch { toast.error('เกิดข้อผิดพลาด'); }
        setProcessing(null);
    };

    return (
        <div className="w-full space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 font-semibold mb-1">รายการรอการอนุมัติ</p>
                        <p className="text-2xl md:text-3xl font-extrabold text-slate-800">{data.data?.length || 0} <span className="text-base font-medium text-slate-500">รายการ</span></p>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                        <Paperclip size={28} className="text-slate-400" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl shadow-sm p-6 border border-red-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-red-600 font-semibold mb-1">มูลค่ารวมที่รออนุมัติ</p>
                        <p className="text-2xl md:text-3xl font-extrabold text-red-600">{(data.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-base font-medium text-red-500">บาท</span></p>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm border border-red-50">
                        <span className="text-2xl font-bold text-red-500">฿</span>
                    </div>
                </div>
            </div>

            {loading && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin mb-3"></div>
                    <p className="font-medium">กำลังโหลดข้อมูล...</p>
                </div>
            )}
            
            {!loading && data.data?.length === 0 && (
                <div className="bg-white rounded-2xl p-16 text-center border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle size={40} className="text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-1">เยี่ยมมาก! ไม่มีรายการรออนุมัติ</h3>
                    <p className="text-slate-400">ทุกรายการได้รับการตรวจสอบและจัดการเรียบร้อยแล้ว</p>
                </div>
            )}

            <div className="flex flex-col gap-5 w-full">
                {data.data?.map(r => (
                    <div key={r.request_id || r.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all overflow-hidden flex flex-col md:flex-row">
                        {/* Left Side: Info */}
                        <div className="flex-1 p-5 md:p-6 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                                            <Car size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg">{r.vehicle?.license_plate}</h3>
                                            <p className="text-xs text-slate-500 font-medium">{r.vehicle?.brand} {r.vehicle?.model}</p>
                                        </div>
                                    </div>
                                    <StatusBadge status="AWAITING_APPROVAL" />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">เลขที่คำร้อง</p>
                                        <p className="text-sm font-bold text-blue-600">REQ-{String(r.request_id || r.id).padStart(4, '0')}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">วันที่แจ้ง</p>
                                        <p className="text-sm font-medium text-slate-700">{new Date(r.created_at || r.createdAt).toLocaleDateString('th-TH')}</p>
                                    </div>
                                </div>

                                <div className="mb-2">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">รายละเอียดปัญหา</p>
                                    <p className="text-sm font-medium text-slate-700 line-clamp-2">{r.issue_description}</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Cost & Actions */}
                        <div className="w-full md:w-80 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-100 p-5 md:p-6 flex flex-col justify-center">
                            <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 text-center mb-4">
                                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">ยอดขออนุมัติ</p>
                                <p className="text-2xl font-extrabold text-red-600">
                                    {(r.estimated_cost || r.total_cost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-sm font-bold">฿</span>
                                </p>
                            </div>
                            
                            <button 
                                onClick={() => setSelectedRequest(r)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm mb-4"
                            >
                                <Eye size={18} /> ดูรายละเอียด & บิล
                            </button>

                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                <button disabled={processing === (r.request_id || r.id)} onClick={() => handleDecision(r.request_id || r.id, true)}
                                    className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-bold transition-all shadow-sm hover:shadow-md disabled:opacity-50">
                                    <CheckCircle size={16} /> อนุมัติ
                                </button>
                                <button disabled={processing === (r.request_id || r.id)} onClick={() => handleDecision(r.request_id || r.id, false)}
                                    className="flex items-center justify-center gap-1.5 bg-white hover:bg-red-50 border border-red-200 text-red-600 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 hover:border-red-300">
                                    <XCircle size={16} /> ไม่อนุมัติ
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal ดูรายละเอียดแบบเต็ม */}
            {selectedRequest && (
                <Modal title={`รายละเอียดคำร้อง REQ-${String(selectedRequest.request_id || selectedRequest.id).padStart(4, '0')}`} onClose={() => setSelectedRequest(null)}>
                    <div className="space-y-6">
                        {/* ข้อมูลรถและคนขับ */}
                        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                    <Car size={24} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-lg">{selectedRequest.vehicle?.license_plate}</p>
                                    <p className="text-xs text-slate-500">{selectedRequest.vehicle?.brand} {selectedRequest.vehicle?.model}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400 font-semibold uppercase">ผู้ขับ / ผู้แจ้ง</p>
                                <p className="font-semibold text-slate-700">{selectedRequest.vehicle?.driver?.full_name || selectedRequest.vehicle?.driver?.fullName || '-'}</p>
                            </div>
                        </div>

                        {/* รายละเอียดปัญหา */}
                        <div>
                            <h4 className="text-sm font-bold text-slate-700 mb-2 border-b pb-2">รายละเอียดปัญหา</h4>
                            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{selectedRequest.issue_description}</p>
                        </div>

                        {/* ข้อมูลการซ่อม */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-3">
                                <MapPin size={20} className="text-slate-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase">สถานที่ / อู่</p>
                                    <p className="font-medium text-slate-700 mt-1">{selectedRequest.garage ? (selectedRequest.garage.garage_name || selectedRequest.garage.name) : 'อู่นอก / ซ่อมฉุกเฉิน'}</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-3">
                                <Calendar size={20} className="text-slate-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase">กำหนดการ</p>
                                    <div className="mt-1 space-y-1">
                                        {selectedRequest.repair_start_date && <p className="text-xs text-slate-600"><span className="font-medium">เข้าซ่อม:</span> {new Date(selectedRequest.repair_start_date).toLocaleDateString('th-TH')}</p>}
                                        {selectedRequest.estimated_end_date && <p className="text-xs text-slate-600"><span className="font-medium">คาดว่าเสร็จ:</span> {new Date(selectedRequest.estimated_end_date).toLocaleDateString('th-TH')}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ยอดเงินและหลักฐาน */}
                        <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
                            <div className="p-4 flex items-center justify-between bg-red-100/50 border-b border-red-200">
                                <p className="font-bold text-red-800">ยอดที่ขออนุมัติ</p>
                                <p className="text-2xl font-extrabold text-red-600">
                                    {(selectedRequest.estimated_cost || selectedRequest.total_cost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                                </p>
                            </div>
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Paperclip size={16} /> หลักฐาน / ใบเสร็จ</p>
                                    {selectedRequest.receipt_image && (
                                        <a href={selectedRequest.receipt_image} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                            <ExternalLink size={14} /> เปิดรูปเต็ม
                                        </a>
                                    )}
                                </div>
                                
                                {selectedRequest.receipt_image ? (
                                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white group relative">
                                        <a href={selectedRequest.receipt_image} target="_blank" rel="noopener noreferrer">
                                            <img
                                                src={selectedRequest.receipt_image}
                                                alt="ใบเสร็จ"
                                                className="w-full object-contain max-h-[400px] hover:scale-[1.02] transition-transform duration-300"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="bg-white text-slate-800 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg">
                                                    <Eye size={18} /> คลิกเพื่อดูรูปเต็ม
                                                </div>
                                            </div>
                                        </a>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 p-8 flex flex-col items-center justify-center text-slate-400">
                                        <ImageOff size={32} className="mb-2" />
                                        <p className="font-medium text-sm">ไม่มีหลักฐานแนบมา</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons in Modal */}
                        <div className="flex gap-3 pt-4 border-t border-slate-100">
                            <button disabled={processing === (selectedRequest.request_id || selectedRequest.id)} onClick={() => handleDecision(selectedRequest.request_id || selectedRequest.id, false)}
                                className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-red-50 border-2 border-red-200 text-red-600 py-3 px-4 rounded-xl font-bold transition-all disabled:opacity-50 hover:border-red-300">
                                <XCircle size={20} /> ไม่อนุมัติ
                            </button>
                            <button disabled={processing === (selectedRequest.request_id || selectedRequest.id)} onClick={() => handleDecision(selectedRequest.request_id || selectedRequest.id, true)}
                                className="flex-[2] flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50">
                                <CheckCircle size={20} /> อนุมัติรายการนี้
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
