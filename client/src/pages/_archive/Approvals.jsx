import { useEffect, useState, useCallback } from 'react';
import { 
    CheckCircle, 
    XCircle, 
    ExternalLink, 
    ImageOff, 
    Paperclip, 
    Eye, 
    X, 
    Car, 
    MapPin, 
    Calendar, 
    Search 
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import api from '../../lib/axios';
import { toast } from 'react-toastify';

const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return "-";
    return d.toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col transform transition-all">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-base font-bold text-slate-800">{title}</h3>
                <button type="button" onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X size={18} />
                </button>
            </div>
            <div className="p-5 overflow-y-auto">{children}</div>
        </div>
    </div>
);

export default function ApprovalsPage() {
    const [data, setData] = useState({ data: [], totalAmount: 0 });
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [viewReceipt, setViewReceipt] = useState(null);
    const [search, setSearch] = useState('');

    const fetchData = useCallback(async () => {
        try { 
            const res = await api.get('/reports/approvals'); 
            setData(res.data); 
        }
        catch { 
            toast.error('โหลดข้อมูลไม่สำเร็จ'); 
        }
        finally { 
            setLoading(false); 
        }
    }, []);

    useEffect(() => { 
        fetchData(); 
    }, [fetchData]);

    const handleDecision = async (id, approved) => {
        const note = approved ? 'อนุมัติโดยผู้ดูแลระบบ (Admin)' : window.prompt('กรุณาระบุเหตุผลที่ไม่อนุมัติ:');
        if (!approved && !note) return;
        setProcessing(id);
        try {
            await api.patch(`/repairs/${id}/approve`, { approved, note });
            toast.success(approved ? 'อนุมัติสำเร็จ' : 'ไม่อนุมัติเรียบร้อย');
            setSelectedRequest(null);
            fetchData();
        } catch { 
            toast.error('เกิดข้อผิดพลาด'); 
        }
        setProcessing(null);
    };

    const filteredData = (data.data || []).filter(r => {
        if (!search) return true;
        const q = search.toLowerCase();
        const reqId = `req-${String(r.request_id || r.id).padStart(4, '0')}`.toLowerCase();
        const plate = (r.vehicle?.license_plate || '').toLowerCase();
        const brand = (r.vehicle?.brand || '').toLowerCase();
        const driver = (r.vehicle?.driver?.full_name || r.vehicle?.driver?.fullName || '').toLowerCase();
        const desc = (r.issue_description || '').toLowerCase();
        return reqId.includes(q) || plate.includes(q) || brand.includes(q) || driver.includes(q) || desc.includes(q);
    });

    const totalAmount = (data.data || []).reduce(
        (sum, r) => sum + Number(r.total_cost || r.estimated_cost || 0),
        0
    );

    return (
        <div className="w-full space-y-4">
            {/* Top Toolbar & Summary */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 md:p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="relative flex-1 sm:max-w-xs">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="ค้นหาเลขที่, ทะเบียน, ปัญหา..."
                        className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#8A1ABA] w-full"
                    />
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg border border-purple-100 font-medium">
                        <span>รอการอนุมัติ:</span>
                        <strong className="font-bold">{data.data?.length || 0}</strong>
                        <span>รายการ</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 rounded-lg border border-amber-100 font-medium">
                        <span>ยอดรวม:</span>
                        <strong className="font-semibold text-slate-800 text-sm">
                            {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </strong>
                        <span className="text-xs text-slate-600">บาท</span>
                    </div>
                </div>
            </div>

            {loading && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-[#8A1ABA] rounded-full animate-spin mb-3"></div>
                    <p className="font-medium text-sm">กำลังโหลดข้อมูลคำร้อง...</p>
                </div>
            )}
            
            {!loading && filteredData.length === 0 && (
                <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                    <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-3 text-green-600">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="text-base font-bold text-slate-700 mb-1">
                        {data.data?.length === 0 ? "ไม่มีรายการรออนุมัติ" : "ไม่พบข้อมูลที่ค้นหา"}
                    </h3>
                    <p className="text-xs text-slate-400">
                        {data.data?.length === 0 
                            ? "ทุกรายการได้รับการตรวจสอบและจัดการเรียบร้อยแล้ว" 
                            : "ลองเปลี่ยนคำค้นหาหรือล้างคำค้นหาใหม่อีกครั้ง"}
                    </p>
                </div>
            )}

            {!loading && filteredData.length > 0 && (
                <>
                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {filteredData.map((r) => {
                            const reqNo = `REQ-${String(r.request_id || r.id).padStart(4, '0')}`;
                            const cost = r.estimated_cost || r.total_cost || 0;

                            return (
                                <div key={r.request_id || r.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div
                                            className="cursor-pointer group flex items-center gap-2"
                                            onClick={() => setSelectedRequest(r)}
                                        >
                                            <span className="font-semibold text-blue-600 text-sm group-hover:underline">{reqNo}</span>
                                            <span className="text-xs text-slate-500">{formatDate(r.created_at || r.createdAt)}</span>
                                        </div>
                                        <StatusBadge status="AWAITING_APPROVAL" />
                                    </div>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-slate-800 text-base">{r.vehicle?.license_plate}</p>
                                                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold border inline-block bg-rose-50 text-rose-700 border-rose-200">
                                                    ซ่อมฉุกเฉิน
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">{r.vehicle?.brand} {r.vehicle?.model}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[11px] text-slate-400">ยอดขออนุมัติ</p>
                                            <p className="text-base font-semibold text-slate-800">
                                                {parseFloat(cost).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        {r.issue_description}
                                    </p>
                                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRequest(r)}
                                            className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                                        >
                                            <Eye size={14} /> รายละเอียด
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                disabled={processing === (r.request_id || r.id)}
                                                onClick={() => handleDecision(r.request_id || r.id, false)}
                                                className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                                            >
                                                <XCircle size={14} /> ไม่อนุมัติ
                                            </button>
                                            <button
                                                type="button"
                                                disabled={processing === (r.request_id || r.id)}
                                                onClick={() => handleDecision(r.request_id || r.id, true)}
                                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                                            >
                                                <CheckCircle size={14} /> อนุมัติ
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3.5 font-semibold text-center">เลขที่ / วันที่</th>
                                        <th className="px-4 py-3.5 font-semibold">ยานพาหนะ</th>
                                        <th className="px-4 py-3.5 font-semibold">ผู้ขับ / ผู้แจ้ง</th>
                                        <th className="px-4 py-3.5 font-semibold max-w-xs">รายละเอียดปัญหา</th>
                                        <th className="px-4 py-3.5 font-semibold">ประเภท / วันที่ซ่อม</th>
                                        <th className="px-4 py-3.5 font-semibold text-right">ยอดขออนุมัติ</th>
                                        <th className="px-4 py-3.5 font-semibold text-center">บิล / หลักฐาน</th>
                                        <th className="px-4 py-3.5 font-semibold text-center">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredData.map((r) => {
                                        const reqNo = `REQ-${String(r.request_id || r.id).padStart(4, '0')}`;
                                        const cost = r.estimated_cost || r.total_cost || 0;
                                        const driverName = r.vehicle?.driver?.full_name || r.vehicle?.driver?.fullName || '-';
                                        const garageName = r.garage?.garage_name || r.garage?.name;

                                        return (
                                            <tr key={r.request_id || r.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3.5 text-center">
                                                    <div
                                                        className="cursor-pointer group inline-block"
                                                        onClick={() => setSelectedRequest(r)}
                                                    >
                                                        <div className="font-semibold text-blue-600 group-hover:underline text-sm">
                                                            {reqNo}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {formatDate(r.created_at || r.createdAt)}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="font-semibold text-slate-800">{r.vehicle?.license_plate}</div>
                                                    <div className="text-xs text-slate-500">{r.vehicle?.brand} {r.vehicle?.model}</div>
                                                </td>
                                                <td className="px-4 py-3.5 text-slate-700">
                                                    {driverName}
                                                </td>
                                                <td className="px-4 py-3.5 max-w-xs">
                                                    <p className="truncate text-slate-600" title={r.issue_description}>
                                                        {r.issue_description}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="mb-1">
                                                        <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold border inline-block bg-rose-50 text-rose-700 border-rose-200">
                                                            ซ่อมฉุกเฉิน
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {formatDate(r.repair_start_date || r.created_at || r.createdAt)}
                                                        {r.estimated_end_date && ` → ${formatDate(r.estimated_end_date)}`}
                                                    </div>
                                                    {garageName && (
                                                        <div className="text-xs text-slate-400 mt-0.5">
                                                            {garageName}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-semibold text-slate-800 text-sm">
                                                    {parseFloat(cost).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    {r.receipt_image ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewReceipt(r.receipt_image)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-[#8A1ABA] hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer shadow-xs active:scale-95"
                                                            title="คลิกเพื่อดูสลิปขนาดเต็ม"
                                                        >
                                                            <Paperclip size={13} />
                                                            <span>มีบิลแนบ</span>
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">ไม่มีบิล</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedRequest(r)}
                                                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                                            title="ดูรายละเอียด"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={processing === (r.request_id || r.id)}
                                                            onClick={() => handleDecision(r.request_id || r.id, true)}
                                                            className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                                                            title="อนุมัติคำร้องนี้"
                                                        >
                                                            <CheckCircle size={14} />
                                                            <span>อนุมัติ</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={processing === (r.request_id || r.id)}
                                                            onClick={() => handleDecision(r.request_id || r.id, false)}
                                                            className="px-2.5 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
                                                            title="ปฏิเสธคำร้อง"
                                                        >
                                                            <XCircle size={14} />
                                                            <span>ไม่อนุมัติ</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Modal ดูรายละเอียดแบบเต็ม */}
            {selectedRequest && (
                <Modal title={`รายละเอียดคำร้อง REQ-${String(selectedRequest.request_id || selectedRequest.id).padStart(4, '0')}`} onClose={() => setSelectedRequest(null)}>
                    <div className="space-y-4">
                        {/* ข้อมูลรถและคนขับ */}
                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 bg-purple-100 text-[#8A1ABA] rounded-lg flex items-center justify-center shrink-0">
                                    <Car size={18} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <p className="font-bold text-slate-800 text-sm">{selectedRequest.vehicle?.license_plate}</p>
                                        <span className="text-[10px] px-2 py-0.2 rounded-full font-semibold border inline-block bg-rose-50 text-rose-700 border-rose-200">
                                            ซ่อมฉุกเฉิน
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500">{selectedRequest.vehicle?.brand} {selectedRequest.vehicle?.model}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-400 font-semibold uppercase">ผู้ขับ / ผู้แจ้ง</p>
                                <p className="font-semibold text-slate-700 text-xs">{selectedRequest.vehicle?.driver?.full_name || selectedRequest.vehicle?.driver?.fullName || '-'}</p>
                            </div>
                        </div>

                        {/* รายละเอียดปัญหา */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 mb-1">รายละเอียดปัญหา</h4>
                            <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap bg-slate-50 p-2.5 rounded-xl border border-slate-200">{selectedRequest.issue_description}</p>
                        </div>

                        {/* ข้อมูลการซ่อม */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-start gap-2">
                                <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-500">ประเภท / อู่</p>
                                    <p className="font-medium text-slate-700 text-xs mt-0.5">{selectedRequest.garage ? (selectedRequest.garage.garage_name || selectedRequest.garage.name) : 'อู่นอก / ซ่อมฉุกเฉิน'}</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-start gap-2">
                                <Calendar size={16} className="text-slate-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-500">กำหนดการ</p>
                                    <div className="mt-0.5 space-y-0.5 text-xs text-slate-600">
                                        {selectedRequest.repair_start_date && <p><span className="font-medium">เข้าซ่อม:</span> {formatDate(selectedRequest.repair_start_date)}</p>}
                                        {selectedRequest.estimated_end_date && <p><span className="font-medium">คาดว่าเสร็จ:</span> {formatDate(selectedRequest.estimated_end_date)}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ยอดเงินและหลักฐาน */}
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                            <div className="px-3.5 py-2.5 flex items-center justify-between bg-purple-50/70 border-b border-purple-100">
                                <p className="font-bold text-[#8A1ABA] text-xs">ยอดที่ขออนุมัติ</p>
                                <p className="text-base font-bold text-slate-800">
                                    {parseFloat(selectedRequest.estimated_cost || selectedRequest.total_cost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                                </p>
                            </div>
                            <div className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><Paperclip size={13} /> หลักฐาน / ใบเสร็จ</p>
                                    {selectedRequest.receipt_image && (
                                        <button 
                                            type="button" 
                                            onClick={() => setViewReceipt(selectedRequest.receipt_image)} 
                                            className="text-xs font-semibold text-[#8A1ABA] hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            <Eye size={13} /> ดูสลิปขนาดเต็ม
                                        </button>
                                    )}
                                </div>
                                
                                {selectedRequest.receipt_image ? (
                                    <div 
                                        onClick={() => setViewReceipt(selectedRequest.receipt_image)}
                                        className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 group relative cursor-pointer"
                                    >
                                        <img
                                            src={selectedRequest.receipt_image}
                                            alt="ใบเสร็จ"
                                            className="w-full object-contain max-h-[180px] hover:scale-[1.01] transition-transform duration-200"
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="bg-white text-slate-800 px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1 shadow-md">
                                                <Eye size={13} /> คลิกดูภาพใหญ่
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-4 flex flex-col items-center justify-center text-slate-400">
                                        <ImageOff size={22} className="mb-1 text-slate-300" />
                                        <p className="font-medium text-xs">ไม่มีหลักฐานแนบมา</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons in Modal (Bottom-Right Aligned) */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                            <button 
                                type="button"
                                disabled={processing === (selectedRequest.request_id || selectedRequest.id)} 
                                onClick={() => handleDecision(selectedRequest.request_id || selectedRequest.id, false)}
                                className="px-4 py-2 bg-white hover:bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                            >
                                <XCircle size={15} />
                                <span>ไม่อนุมัติ</span>
                            </button>
                            <button 
                                type="button"
                                disabled={processing === (selectedRequest.request_id || selectedRequest.id)} 
                                onClick={() => handleDecision(selectedRequest.request_id || selectedRequest.id, true)}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer"
                            >
                                <CheckCircle size={15} />
                                <span>อนุมัติรายการนี้</span>
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Receipt Image Lightbox Modal */}
            {viewReceipt && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" 
                    onClick={() => setViewReceipt(null)}
                >
                    <div 
                        className="relative max-w-2xl w-full flex flex-col items-center bg-white rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                <Paperclip size={15} className="text-[#8A1ABA]" />
                                หลักฐาน / ใบเสร็จ
                            </span>
                            <button
                                type="button"
                                onClick={() => setViewReceipt(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                                title="ปิดหน้าต่าง"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4 w-full flex justify-center bg-slate-900/5 max-h-[75vh] overflow-auto">
                            <img 
                                src={viewReceipt} 
                                alt="ใบเสร็จ" 
                                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm" 
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
