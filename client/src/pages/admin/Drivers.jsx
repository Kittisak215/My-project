import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import api from '../../lib/axios';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import clsx from 'clsx';

const StatusBadge = ({ isActive }) => (
    <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600')}>
        {isActive ? '🟢 ปฏิบัติงาน' : '⚫ พ้นสภาพ'}
    </span>
);

const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 md:p-6 border-b">
                <h3 className="text-base md:text-lg font-semibold text-slate-800">{title}</h3>
                <button type="button" onClick={onClose}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-5 md:p-6">{children}</div>
        </div>
    </div>
);

export default function DriversPage() {
    const [drivers, setDrivers] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const { register, handleSubmit, reset } = useForm();
    const limit = 10;

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const params = { search, page, limit };
            if (status !== '') params.is_active = status === 'true';
            const res = await api.get('/drivers', { params });
            setDrivers(res.data.data); setTotal(res.data.total);
        } catch { toast.error('โหลดข้อมูลไม่สำเร็จ'); }
        setLoading(false);
    };

    useEffect(() => { fetchDrivers(); }, [search, status, page]);

    const openCreate = () => { setEditing(null); reset({ is_active: 'true' }); setShowModal(true); };
    const openEdit = (d) => { setEditing(d); reset({ full_name: d.full_name, phone: d.phone, is_active: d.is_active ? 'true' : 'false' }); setShowModal(true); };

    const onSubmit = async (data) => {
        try {
            const payload = { ...data, is_active: data.is_active === 'true' };
            if (editing) await api.put(`/drivers/${editing.driver_id}`, payload);
            else await api.post('/drivers', payload);
            toast.success(editing ? 'แก้ไขสำเร็จ' : 'เพิ่มสำเร็จ');
            setShowModal(false); fetchDrivers();
        } catch (err) { toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('ยืนยันการลบ? ข้อมูลที่เกี่ยวโยงอาจทำให้ลบไม่ได้ ให้ใช้การเปลี่ยนสถานะแทนหากลบไม่สำเร็จ')) return;
        try { await api.delete(`/drivers/${id}`); toast.success('ลบสำเร็จ'); fetchDrivers(); }
        catch { toast.error('ลบไม่สำเร็จ (มีข้อมูลผูกอยู่ แนะนำให้แก้ไขเป็นสถานะพ้นสภาพแทน)'); }
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center bg-white p-4 rounded-xl shadow-sm mb-4 md:mb-6 gap-3 border border-slate-100">
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="ค้นหาชื่อ, เบอร์โทร..."
                            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-full sm:w-56" />
                    </div>
                    <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                        <option value="">สถานะทั้งหมด</option>
                        <option value="true">ปฏิบัติงาน</option>
                        <option value="false">พ้นสภาพ</option>
                    </select>
                </div>
                <button onClick={openCreate} className="bg-[#8A1ABA] hover:bg-[#72159c] text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 w-full md:w-auto">
                    + เพิ่มผู้รับผิดชอบ
                </button>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 mb-4">
                {loading && <p className="text-center py-8 text-slate-400">กำลังโหลด...</p>}
                {!loading && drivers.length === 0 && <p className="text-center py-8 text-slate-400">ไม่พบข้อมูล</p>}
                {drivers.map(d => (
                    <div key={d.driver_id} className={clsx('bg-white rounded-xl border border-slate-200 p-4 shadow-sm', !d.is_active && 'opacity-70')}>
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-slate-400">#{d.driver_id}</span>
                                    <StatusBadge isActive={d.is_active} />
                                </div>
                                <p className="font-semibold text-slate-800">{d.full_name}</p>
                                <p className="text-sm text-slate-500">{d.phone}</p>
                                <p className="text-xs text-slate-400 mt-1">ผูกบัญชี: {d.userAccount?.username || '-'}</p>
                                <span className="bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs font-medium mt-2 inline-block">{d.vehicles?.length || 0} คัน</span>
                            </div>
                            <div className="flex items-center gap-1 ml-2 shrink-0">
                                <button onClick={() => openEdit(d)} className="px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg border border-amber-200">แก้ไข</button>
                                <button onClick={() => handleDelete(d.driver_id)} disabled={d.vehicles?.length > 0} className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 disabled:opacity-30">ลบ</button>
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
                            <th className="px-6 py-4 font-semibold text-center w-16">รหัส</th>
                            <th className="px-6 py-4 font-semibold">ชื่อ - นามสกุล</th>
                            <th className="px-6 py-4 font-semibold">เบอร์โทรศัพท์</th>
                            <th className="px-6 py-4 font-semibold text-center">จำนวนรถ</th>
                            <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
                            <th className="px-6 py-4 font-semibold text-center">จัดการ</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && <tr><td colSpan={6} className="text-center py-8 text-slate-400">กำลังโหลด...</td></tr>}
                            {!loading && drivers.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400">ไม่พบข้อมูล</td></tr>}
                            {drivers.map(d => (
                                <tr key={d.driver_id} className={clsx('hover:bg-slate-50 transition-colors', !d.is_active && 'opacity-70')}>
                                    <td className="px-6 py-4 text-center text-slate-500">#{d.driver_id}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-800">{d.full_name}</div>
                                        <div className="text-xs text-slate-500">ผูกบัญชี: {d.userAccount?.username || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{d.phone}</td>
                                    <td className="px-6 py-4 text-center"><span className="bg-blue-100 text-blue-700 py-1 px-3 rounded-full text-xs font-medium">{d.vehicles?.length || 0} คัน</span></td>
                                    <td className="px-6 py-4 text-center"><StatusBadge isActive={d.is_active} /></td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <button onClick={() => openEdit(d)} className="px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded border border-amber-200">แก้ไข</button>
                                            <button onClick={() => handleDelete(d.driver_id)} disabled={d.vehicles?.length > 0} className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded border border-red-200 disabled:opacity-30 disabled:cursor-not-allowed">ลบ</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm">
                    <span className="text-slate-500">แสดง {drivers.length} จากทั้งหมด {total} รายการ</span>
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
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded bg-white disabled:opacity-50 text-sm">ก่อนหน้า</button>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded bg-white disabled:opacity-50 text-sm">ถัดไป</button>
                </div>
            </div>

            {showModal && (
                <Modal title={editing ? 'แก้ไขผู้รับผิดชอบ' : 'เพิ่มผู้รับผิดชอบ'} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div><label className="text-sm font-medium text-slate-700">ชื่อ - นามสกุล *</label>
                            <input {...register('full_name', { required: true })} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" /></div>
                        <div><label className="text-sm font-medium text-slate-700">เบอร์โทรศัพท์ *</label>
                            <input {...register('phone', { required: true })} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" /></div>
                        <div><label className="text-sm font-medium text-slate-700">สถานะ</label>
                            <select {...register('is_active')} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                                <option value="true">ปฏิบัติงาน</option>
                                <option value="false">พ้นสภาพ</option>
                            </select></div>
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">ยกเลิก</button>
                            <button type="submit" className="px-4 py-2 bg-[#8A1ABA] text-white rounded-lg text-sm font-medium hover:bg-[#72159c]">{editing ? 'บันทึก' : 'เพิ่ม'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
