import { useEffect, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import api from '../../lib/axios';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';

const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 md:p-6 border-b">
                <h3 className="text-base md:text-lg font-semibold">{title}</h3>
                <button type="button" onClick={onClose}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-5 md:p-6">{children}</div>
        </div>
    </div>
);

export default function GaragesPage() {
    const [garages, setGarages] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [specFilter, setSpecFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const { register, handleSubmit, reset } = useForm();
    const limit = 10;

    const fetchGarages = async () => {
        setLoading(true);
        try {
            const params = { search, page, limit };
            if (specFilter !== 'ALL') params.specialization = specFilter;
            const res = await api.get('/garages', { params });
            setGarages(res.data.data); setTotal(res.data.total);
        } catch { toast.error('โหลดข้อมูลไม่สำเร็จ'); }
        setLoading(false);
    };

    useEffect(() => { fetchGarages(); }, [search, specFilter, page]);

    const openCreate = () => { setEditing(null); reset({ specialization: ['GENERAL'] }); setShowModal(true); };
    const openEdit = (g) => {
        setEditing(g);
        reset({
            garage_name: g.garage_name,
            phone: g.phone,
            address: g.address,
            sub_district: g.sub_district,
            district: g.district,
            province: g.province,
            postal_code: g.postal_code,
            specialization: g.specialization || ['GENERAL']
        });
        setShowModal(true);
    };

    const onSubmit = async (data) => {
        try {
            if (editing) await api.put(`/garages/${editing.garage_id}`, data);
            else await api.post('/garages', data);
            toast.success(editing ? 'แก้ไขสำเร็จ' : 'เพิ่มสำเร็จ');
            setShowModal(false); fetchGarages();
        } catch (err) { toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('ยืนยันการลบ?')) return;
        try { await api.delete(`/garages/${id}`); toast.success('ลบสำเร็จ'); fetchGarages(); }
        catch { toast.error('ลบไม่สำเร็จ (อาจมีข้อมูลการซ่อมผูกอยู่)'); }
    };

    const specLabels = { 'GENERAL': 'ทั่วไป', 'ENGINE': 'เครื่องยนต์', 'ELECTRICAL': 'ระบบไฟ', 'SUSPENSION': 'ช่วงล่าง', 'BODY_PAINT': 'ตัวถังและสี', 'TIRES': 'ยาง' };

    return (
        <div>
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center bg-white p-4 rounded-xl shadow-sm mb-4 md:mb-6 gap-3 border border-slate-100">
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="ค้นหาชื่ออู่..."
                            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-full sm:w-52 focus:outline-none focus:border-blue-500" />
                    </div>
                    <select value={specFilter} onChange={(e) => { setSpecFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white">
                        <option value="ALL">ความเชี่ยวชาญ (ทั้งหมด)</option>
                        <option value="GENERAL">ซ่อมทั่วไป</option>
                        <option value="ENGINE">เครื่องยนต์</option>
                        <option value="ELECTRICAL">ระบบไฟ</option>
                        <option value="SUSPENSION">ช่วงล่าง</option>
                        <option value="BODY_PAINT">ตัวถังและสี</option>
                        <option value="TIRES">ยางรถยนต์</option>
                    </select>
                </div>
                <button onClick={openCreate} className="bg-[#8A1ABA] hover:bg-[#72159c] text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 shrink-0">
                    <Plus size={16} /> เพิ่มอู่/ศูนย์บริการ
                </button>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 mb-4">
                {loading && <p className="text-center py-8 text-slate-400">กำลังโหลด...</p>}
                {!loading && garages.length === 0 && <p className="text-center py-8 text-slate-400">ไม่พบข้อมูล</p>}
                {garages.map(g => (
                    <div key={g.garage_id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-slate-400">#{g.garage_id}</span>
                                </div>
                                <p className="font-semibold text-slate-800">{g.garage_name}</p>
                                <p className="text-sm text-slate-500">{g.phone || '-'}</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {g.specialization?.map(spec => (
                                        <span key={spec} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{specLabels[spec] || spec}</span>
                                    ))}
                                </div>
                                {[g.address, g.district, g.province].filter(Boolean).length > 0 && (
                                    <p className="text-xs text-slate-400 mt-1 truncate">{[g.address, g.district, g.province].filter(Boolean).join(' ')}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-1 ml-2 shrink-0">
                                <button onClick={() => openEdit(g)} className="px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg border border-amber-200">แก้ไข</button>
                                <button onClick={() => handleDelete(g.garage_id)} className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200">ลบ</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200"><tr>
                            <th className="px-6 py-4 font-semibold">รหัส</th>
                            <th className="px-6 py-4 font-semibold">ชื่ออู่/ศูนย์บริการ</th>
                            <th className="px-6 py-4 font-semibold">ความเชี่ยวชาญ</th>
                            <th className="px-6 py-4 font-semibold">เบอร์โทรศัพท์</th>
                            <th className="px-6 py-4 font-semibold">ที่อยู่</th>
                            <th className="px-6 py-4 font-semibold text-center">จัดการ</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && <tr><td colSpan={6} className="text-center py-8 text-slate-400">กำลังโหลด...</td></tr>}
                            {!loading && garages.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400">ไม่พบข้อมูล</td></tr>}
                            {garages.map(g => (
                                <tr key={g.garage_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-slate-500">#{g.garage_id}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-800">{g.garage_name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        <div className="flex flex-wrap gap-1">
                                            {g.specialization?.map(spec => (
                                                <span key={spec} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{specLabels[spec] || spec}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{g.phone || '-'}</td>
                                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                                        {[g.address, g.sub_district, g.district, g.province, g.postal_code].filter(Boolean).join(' ') || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <button onClick={() => openEdit(g)} className="px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded border border-amber-200">แก้ไข</button>
                                            <button onClick={() => handleDelete(g.garage_id)} className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded border border-red-200">ลบ</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 text-sm text-slate-500">แสดง {garages.length} จากทั้งหมด {total} รายการ</div>
            </div>

            {/* Mobile Pagination */}
            <div className="md:hidden flex items-center justify-between text-sm mt-2 px-1">
                <span className="text-slate-500">{total} รายการ</span>
                <div className="flex space-x-1">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded bg-white disabled:opacity-50">ก่อนหน้า</button>
                    <button disabled={garages.length < limit} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded bg-white disabled:opacity-50">ถัดไป</button>
                </div>
            </div>

            {showModal && (
                <Modal title={editing ? 'แก้ไขอู่/ศูนย์บริการ' : 'เพิ่มอู่/ศูนย์บริการ'} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div><label className="text-sm font-medium text-slate-700">ชื่ออู่/ศูนย์บริการ *</label>
                            <input {...register('garage_name', { required: true })} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" /></div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">ความเชี่ยวชาญ (เลือกได้หลายอย่าง)</label>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                                {[
                                    { id: 'GENERAL', label: 'ซ่อมทั่วไป' },
                                    { id: 'ENGINE', label: 'เครื่องยนต์' },
                                    { id: 'ELECTRICAL', label: 'ระบบไฟ' },
                                    { id: 'SUSPENSION', label: 'ช่วงล่าง' },
                                    { id: 'BODY_PAINT', label: 'ตัวถังและสี' },
                                    { id: 'TIRES', label: 'ยางรถยนต์' },
                                ].map(spec => (
                                    <label key={spec.id} className="flex items-center space-x-2 text-sm text-slate-600">
                                        <input type="checkbox" value={spec.id} {...register('specialization')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                        <span>{spec.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div><label className="text-sm font-medium text-slate-700">เบอร์โทรศัพท์ *</label>
                            <input {...register('phone', { required: true })} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" /></div>

                        <div><label className="text-sm font-medium text-slate-700">บ้านเลขที่/ถนน</label>
                            <textarea {...register('address')} rows={2} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" /></div>

                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-sm font-medium text-slate-700">ตำบล/แขวง</label>
                                <input {...register('sub_district')} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" /></div>
                            <div><label className="text-sm font-medium text-slate-700">อำเภอ/เขต</label>
                                <input {...register('district')} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" /></div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-sm font-medium text-slate-700">จังหวัด</label>
                                <input {...register('province')} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" /></div>
                            <div><label className="text-sm font-medium text-slate-700">รหัสไปรษณีย์</label>
                                <input {...register('postal_code')} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" /></div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">ยกเลิก</button>
                            <button type="submit" className="px-4 py-2 bg-[#8A1ABA] text-white rounded-lg text-sm font-medium hover:bg-[#72159c]">{editing ? 'บันทึก' : 'เพิ่ม'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
