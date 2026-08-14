import { useEffect, useState, useCallback } from 'react';
import { Search, X, ExternalLink, ImageOff } from 'lucide-react';
import api from '../../lib/axios';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import clsx from 'clsx';

const statusMap = {
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
    COMPLETED: 'bg-green-100 text-green-700 border-green-200',
    AWAITING_APPROVAL: 'bg-purple-100 text-purple-700 border-purple-200',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700'
};
const statusLabel = {
    PENDING: '📝 รอตรวจสอบ',
    IN_PROGRESS: '🔧 กำลังดำเนินการ',
    COMPLETED: '✅ ซ่อมเสร็จสิ้น',
    AWAITING_APPROVAL: '⏳ รออนุมัติ',
    APPROVED: '✅ อนุมัติแล้ว',
    REJECTED: '❌ ไม่อนุมัติ'
};

const repairTypeMap = {
    GENERAL: { label: 'ซ่อมทั่วไป', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    MAINTENANCE: { label: 'บำรุงรักษาตามระยะ', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    EMERGENCY: { label: 'ซ่อมฉุกเฉิน', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const RepairTypeBadge = ({ type }) => {
    const info = repairTypeMap[type] || { label: type || 'ซ่อมทั่วไป', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    return <span className={clsx('text-xs px-2.5 py-0.5 rounded-full font-semibold border inline-block', info.cls)}>{info.label}</span>;
};

const StatusBadge = ({ status }) => (
    <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap', statusMap[status])}>{statusLabel[status]}</span>
);

const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 md:p-6 border-b">
                <h3 className="text-base md:text-lg font-semibold text-slate-800">{title}</h3>
                <button type="button" onClick={onClose}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-5 md:p-6">{children}</div>
        </div>
    </div>
);

export default function RepairsPage() {
    const [repairs, setRepairs] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedRepair, setSelectedRepair] = useState(null);
    const [selectedDetailRepair, setSelectedDetailRepair] = useState(null);
    const [garages, setGarages] = useState([]);
    const { register, handleSubmit, reset } = useForm();
    const limit = 10;

    const fetchAll = useCallback(async () => {
        try {
            const [rRes, gRes] = await Promise.all([
                api.get('/repairs', { params: { search, status, page, limit } }),
                api.get('/garages', { params: { limit: 100 } }),
            ]);
            setRepairs(rRes.data.data); setTotal(rRes.data.total);
            setGarages(gRes.data.data);
        } catch { toast.error('โหลดข้อมูลไม่สำเร็จ'); }
        finally { setLoading(false); }
    }, [search, status, page, limit]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const openStatusModal = (r) => {
        setSelectedRepair(r);
        reset({ status: r.status, note: r.note, garage_id: r.garage_id, total_cost: r.total_cost });
        setShowStatusModal(true);
    };

    const openDetailModal = (r) => {
        setSelectedDetailRepair(r);
        setShowDetailModal(true);
    };

    const onStatusSubmit = async (data) => {
        try {
            await api.patch(`/repairs/${selectedRepair.request_id}/status`, data);
            toast.success('อัปเดตสถานะสำเร็จ');
            setShowStatusModal(false); fetchAll();
        } catch (err) { toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('ยืนยันการลบ?')) return;
        try { await api.delete(`/repairs/${id}`); toast.success('ลบสำเร็จ'); fetchAll(); }
        catch { toast.error('ลบไม่สำเร็จ'); }
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div>
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center bg-white p-4 rounded-xl shadow-sm mb-4 md:mb-6 gap-3 border border-slate-100">
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <div className="relative flex-1 sm:flex-none">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="ค้นหาเลขที่, ทะเบียนรถ..."
                            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-full sm:w-56" />
                    </div>
                    <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                        <option value="">สถานะทั้งหมด</option>
                        <option value="PENDING">รอตรวจสอบ</option>
                        <option value="IN_PROGRESS">กำลังซ่อม</option>
                        <option value="AWAITING_APPROVAL">รออนุมัติ</option>
                        <option value="COMPLETED">เสร็จสิ้น</option>
                    </select>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 mb-4">
                {loading && <p className="text-center py-8 text-slate-400">กำลังโหลด...</p>}
                {!loading && repairs.length === 0 && <p className="text-center py-8 text-slate-400">ไม่พบข้อมูล</p>}
                {repairs.map(r => (
                    <div key={r.request_id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <span className="font-semibold text-blue-600 text-sm">REQ-{String(r.request_id).padStart(4, '0')}</span>
                                <span className="text-xs text-slate-400 ml-2">{new Date(r.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                            </div>
                            <StatusBadge status={r.status} />
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                            <p className="font-semibold text-slate-800">{r.vehicle?.license_plate}</p>
                            <RepairTypeBadge type={r.repair_type} />
                        </div>
                        <p className="text-sm text-slate-600 mb-2 line-clamp-2">{r.issue_description}</p>
                        <div className="flex items-center justify-between">
                            <div className="text-xs text-slate-500">
                                {r.garage ? <span>{r.garage.garage_name}</span> : <span className="italic">รอระบุอู่</span>}
                                {r.total_cost && <span className="ml-2 font-semibold text-slate-700">{parseFloat(r.total_cost).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.</span>}
                            </div>
                            <div className="flex items-center gap-1.5">
                                {r.status !== 'COMPLETED' && r.status !== 'REJECTED' && (
                                    <button onClick={() => openStatusModal(r)} className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded border border-blue-200">
                                        {r.status === 'PENDING' ? 'ตรวจสอบ' : 'อัปเดต'}
                                    </button>
                                )}
                                <button onClick={() => openDetailModal(r)} className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded border border-slate-200">
                                    รายละเอียด
                                </button>
                                <button onClick={() => handleDelete(r.request_id)} className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded border border-red-200">ลบ</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 whitespace-nowrap"><tr>
                            <th className="px-6 py-4 font-semibold text-center">เลขที่ / วันที่</th>
                            <th className="px-6 py-4 font-semibold">ทะเบียนรถ</th>
                            <th className="px-6 py-4 font-semibold">ผู้แจ้ง</th>
                            <th className="px-6 py-4 font-semibold w-64">อาการเบื้องต้น</th>
                            <th className="px-6 py-4 font-semibold">อู่ที่ดำเนินการ</th>
                            <th className="px-6 py-4 font-semibold text-right">ค่าใช้จ่าย</th>
                            <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
                            <th className="px-6 py-4 font-semibold text-center">จัดการ</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && <tr><td colSpan={8} className="text-center py-8 text-slate-400">กำลังโหลด...</td></tr>}
                            {!loading && repairs.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-slate-400">ไม่พบข้อมูล</td></tr>}
                            {repairs.map(r => (
                                <tr key={r.request_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-center">
                                        <div className="font-semibold text-blue-600">REQ-{String(r.request_id).padStart(4, '0')}</div>
                                        <div className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-800">{r.vehicle?.license_plate}</div>
                                        <div className="text-xs text-slate-500">ไมล์: {(r.mileage_at_repair || 0).toLocaleString()} กม.</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{r.driver?.full_name || '-'}</td>
                                    <td className="px-6 py-4">
                                        <div className="mb-1"><RepairTypeBadge type={r.repair_type} /></div>
                                        <div className="text-slate-800 text-sm truncate-2">{r.issue_description}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {r.garage ? <><div className="text-slate-800">{r.garage.garage_name}</div><div className="text-xs text-slate-500">{r.garage.phone}</div></> : <span className="text-slate-400 text-xs italic">- รอระบุอู่ -</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right font-semibold text-slate-800">
                                        {r.total_cost ? parseFloat(r.total_cost).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center"><StatusBadge status={r.status} /></td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center space-x-2">
                                            {r.status !== 'COMPLETED' && r.status !== 'REJECTED' && (
                                                <button onClick={() => openStatusModal(r)} className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded border border-blue-200">
                                                    {r.status === 'PENDING' ? 'ตรวจสอบ' : 'อัปเดตสถานะ'}
                                                </button>
                                            )}
                                            <button onClick={() => openDetailModal(r)} className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded border border-slate-200">
                                                รายละเอียด
                                            </button>
                                            <button onClick={() => handleDelete(r.request_id)} className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded border border-red-200">ลบ</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm">
                    <span className="text-slate-500">แสดง {repairs.length} จากทั้งหมด {total} รายการ</span>
                    <div className="flex space-x-1">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded bg-white disabled:opacity-50">ก่อนหน้า</button>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded bg-white disabled:opacity-50">ถัดไป</button>
                    </div>
                </div>
            </div>

            {/* Mobile Pagination */}
            <div className="md:hidden flex items-center justify-between text-sm mt-2 px-1">
                <span className="text-slate-500">{total} รายการ</span>
                <div className="flex space-x-1">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded bg-white disabled:opacity-50">ก่อนหน้า</button>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded bg-white disabled:opacity-50">ถัดไป</button>
                </div>
            </div>

            {showStatusModal && selectedRepair && (
                <Modal title={`อัปเดตสถานะ: REQ-${String(selectedRepair.request_id).padStart(4, '0')}`} onClose={() => setShowStatusModal(false)}>
                    <div className="bg-slate-50 p-3 rounded-lg mb-4 text-sm">
                        <p className="font-medium text-slate-800">{selectedRepair.vehicle?.license_plate}</p>
                        <p className="text-slate-600 mt-1">{selectedRepair.description}</p>
                    </div>
                    <form onSubmit={handleSubmit(onStatusSubmit)} className="space-y-4">
                        <div><label className="text-sm font-medium text-slate-700">สถานะ</label>
                            <select {...register('status', { required: true })} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                                <option value="PENDING">รอตรวจสอบ</option>
                                <option value="IN_PROGRESS">กำลังดำเนินการ</option>
                                <option value="AWAITING_APPROVAL">ส่งรออนุมัติ (งบเกิน 10,000 บาท)</option>
                                <option value="COMPLETED">ซ่อมเสร็จสิ้น</option>
                            </select></div>
                        <div><label className="text-sm font-medium text-slate-700">อู่ที่ดำเนินการ</label>
                            <select {...register('garage_id')} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                                <option value="">ไม่ระบุ</option>
                                {garages.map(g => (
                                    <option key={g.garage_id} value={g.garage_id}>{g.garage_name}</option>
                                ))}
                            </select></div>
                        <div><label className="text-sm font-medium text-slate-700">ค่าใช้จ่ายจริง (บาท)</label>
                            <input {...register('total_cost', { valueAsNumber: true })} type="number" step="0.01" className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" /></div>
                        <div><label className="text-sm font-medium text-slate-700">หมายเหตุจากแอดมิน</label>
                            <textarea {...register('note')} rows={3} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" /></div>
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button type="button" onClick={() => setShowStatusModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">ยกเลิก</button>
                            <button type="submit" className="px-4 py-2 bg-[#8A1ABA] text-white rounded-lg text-sm font-medium hover:bg-[#72159c]">บันทึก</button>
                        </div>
                    </form>
                </Modal>
            )}
            {showDetailModal && selectedDetailRepair && (
                <Modal title={`รายละเอียดการส่งซ่อม: REQ-${String(selectedDetailRepair.request_id).padStart(4, '0')}`} onClose={() => setShowDetailModal(false)}>
                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border">
                            <span className="text-slate-500 font-medium">สถานะคำร้อง</span>
                            <StatusBadge status={selectedDetailRepair.status} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 p-3 rounded-lg border">
                                <p className="text-xs text-slate-400">ทะเบียนรถ</p>
                                <p className="font-semibold text-slate-800">{selectedDetailRepair.vehicle?.license_plate || '-'}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border">
                                <p className="text-xs text-slate-400">เลขไมล์ขณะส่งซ่อม</p>
                                <p className="font-semibold text-slate-800">{(selectedDetailRepair.mileage_at_repair || 0).toLocaleString()} กม.</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border">
                            <p className="text-xs text-slate-400">ผู้แจ้งซ่อม</p>
                            <p className="font-medium text-slate-800">{selectedDetailRepair.driver?.full_name || '-'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border">
                            <p className="text-xs text-slate-400 mb-1">ประเภทการซ่อม / อาการแจ้งซ่อม</p>
                            <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded mr-2">{selectedDetailRepair.repair_type}</span>
                            <p className="text-slate-800 mt-1">{selectedDetailRepair.issue_description}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 p-3 rounded-lg border">
                                <p className="text-xs text-slate-400">อู่ซ่อมบำรุง</p>
                                <p className="font-medium text-slate-800">{selectedDetailRepair.garage?.garage_name || 'ยังไม่ระบุ'}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border">
                                <p className="text-xs text-slate-400">ค่าใช้จ่ายรวม</p>
                                <p className="font-semibold text-blue-600">{selectedDetailRepair.total_cost ? `${parseFloat(selectedDetailRepair.total_cost).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท` : '-'}</p>
                            </div>
                        </div>
                        {selectedDetailRepair.repair_detail && (
                            <div className="bg-slate-50 p-3 rounded-lg border">
                                <p className="text-xs text-slate-400">รายการซ่อมบำรุงเพิ่มเติม</p>
                                <p className="text-slate-700 mt-1">{selectedDetailRepair.repair_detail}</p>
                            </div>
                        )}
                        {selectedDetailRepair.note && (
                            <div className="bg-slate-50 p-3 rounded-lg border">
                                <p className="text-xs text-slate-400">หมายเหตุจากแอดมิน</p>
                                <p className="text-slate-700 mt-1">{selectedDetailRepair.note}</p>
                            </div>
                        )}
                        <div className="bg-slate-50 p-3 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-slate-400">รูปภาพหลักฐาน / ใบเสร็จ</p>
                                {selectedDetailRepair.receipt_image && (
                                    <a
                                        href={selectedDetailRepair.receipt_image}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        <ExternalLink size={12} /> เปิดรูปภาพขนาดเต็ม
                                    </a>
                                )}
                            </div>
                            {selectedDetailRepair.receipt_image ? (
                                <a href={selectedDetailRepair.receipt_image} target="_blank" rel="noopener noreferrer">
                                    <img
                                        src={selectedDetailRepair.receipt_image}
                                        alt="ใบเสร็จ/หลักฐาน"
                                        className="w-full max-h-64 object-contain rounded border bg-white cursor-pointer hover:opacity-90 transition-opacity"
                                    />
                                </a>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                                    <ImageOff size={28} />
                                    <p className="text-xs">ไม่มีรูปภาพหลักฐาน / ใบเสร็จ</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end pt-3 border-t">
                            <button type="button" onClick={() => setShowDetailModal(false)} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700">ปิด</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
