import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react';
import api from '../../lib/axios';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import clsx from 'clsx';

const StatusBadge = ({ status }) => {
    const map = { READY: 'bg-green-100 text-green-700', IN_REPAIR: 'bg-amber-100 text-amber-700', INACTIVE: 'bg-slate-100 text-slate-600' };
    const label = { READY: '🟢 พร้อมใช้งาน', IN_REPAIR: '🛠️ กำลังซ่อม', INACTIVE: '⚫ ปลดระวาง' };
    return <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', map[status])}>{label[status]}</span>;
};

const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 md:p-6 border-b">
                <h3 className="text-base md:text-lg font-semibold text-slate-800">{title}</h3>
                <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-5 md:p-6">{children}</div>
        </div>
    </div>
);

export default function VehiclesPage() {
    const [vehicles, setVehicles] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [drivers, setDrivers] = useState([]);
    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    const limit = 10;

    const fetchVehicles = async () => {
        setLoading(true);
        try {
            const res = await api.get('/vehicles', { params: { search, status, page, limit } });
            setVehicles(res.data.data);
            setTotal(res.data.total);
        } catch { toast.error('โหลดข้อมูลไม่สำเร็จ'); }
        setLoading(false);
    };

    const fetchDrivers = async () => {
        try {
            const res = await api.get('/drivers', { params: { limit: 100 } });
            setDrivers(res.data.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchVehicles(); fetchDrivers(); }, [search, status, page]);

    const openCreate = () => { setEditing(null); reset({ status: 'READY' }); setShowModal(true); };
    const openEdit = (v) => {
        setEditing(v);
        reset({
            license_plate: v.license_plate,
            type_id: v.type_id?.toString(),
            brand: v.brand,
            model: v.model,
            color: v.color,
            year: v.year,
            status: v.status,
            driver_id: v.driver_id ? v.driver_id.toString() : '',
            oil_change_interval_km: v.oil_change_interval_km || '',
            tire_change_interval_km: v.tire_change_interval_km || ''
        });
        setShowModal(true);
    };

    const onSubmit = async (data) => {
        try {
            const payload = {
                license_plate: data.license_plate,
                type_id: parseInt(data.type_id),
                brand: data.brand,
                model: data.model,
                color: data.color,
                year: parseInt(data.year),
                status: data.status,
                driver_id: data.driver_id ? parseInt(data.driver_id) : null,
                oil_change_interval_km: data.oil_change_interval_km ? parseInt(data.oil_change_interval_km) : null,
                tire_change_interval_km: data.tire_change_interval_km ? parseInt(data.tire_change_interval_km) : null
            };
            if (editing) await api.put(`/vehicles/${editing.vehicle_id}`, payload);
            else await api.post('/vehicles', payload);
            toast.success(editing ? 'แก้ไขสำเร็จ' : 'เพิ่มสำเร็จ');
            setShowModal(false);
            fetchVehicles();
        } catch (err) { toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('ยืนยันการลบยานพาหนะ? ข้อมูลที่เกี่ยวโยงอาจทำให้ลบไม่ได้ ให้ใช้การเปลี่ยนสถานะเป็นปลดระวางแทน')) return;
        try { await api.delete(`/vehicles/${id}`); toast.success('ลบสำเร็จ'); fetchVehicles(); }
        catch { toast.error('ลบไม่สำเร็จ (มีข้อมูลซ่อมผูกอยู่ แนะนำให้แก้ไขเป็นสถานะปลดระวางแทน)'); }
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div>
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center bg-white p-4 rounded-xl shadow-sm mb-4 md:mb-6 gap-3 border border-slate-100">
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                        <Search size={16} className="absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={e => { setSearch(e.target.value.trimStart()); setPage(1); }}
                            placeholder="ค้นหาทะเบียนรถ, ยี่ห้อ..." className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#8A1ABA] w-full sm:w-56" />
                    </div>
                    <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
                        className="border border-slate-300 rounded-lg px-4 py-2 text-sm text-slate-600 focus:outline-none focus:border-blue-500">
                        <option value="">สถานะทั้งหมด</option>
                        <option value="READY">พร้อมใช้งาน</option>
                        <option value="IN_REPAIR">กำลังซ่อม</option>
                        <option value="INACTIVE">ปลดระวาง</option>
                    </select>
                </div>
                <button onClick={openCreate} className="bg-[#8A1ABA] hover:bg-[#72159c] text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2 justify-center">
                    <Plus size={16} /> เพิ่มยานพาหนะ
                </button>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 mb-4">
                {loading && <p className="text-center py-8 text-slate-400">กำลังโหลด...</p>}
                {!loading && vehicles.length === 0 && <p className="text-center py-8 text-slate-400">ไม่พบข้อมูล</p>}
                {vehicles.map((v) => (
                    <div key={v.vehicle_id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <p className="font-bold text-slate-800 text-base">{v.license_plate}</p>
                                    <StatusBadge status={v.status} />
                                </div>
                                <p className="text-sm text-slate-600">{v.vehicleType?.type_name || 'ไม่ระบุ'} • {v.brand} {v.model}</p>
                                <p className="text-xs text-slate-400">สี{v.color || '-'} / ปี {v.year || '-'}</p>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                                    <span>👤 {v.driver?.full_name || 'ไม่ระบุ'}</span>
                                    <span>🛢️ {v.oil_change_interval_km?.toLocaleString() || '-'} กม.</span>
                                    <span>🛞 {v.tire_change_interval_km?.toLocaleString() || '-'} กม.</span>
                                    <span className="font-semibold text-slate-700">📍 {(v.current_mileage || 0).toLocaleString()} กม.</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2 shrink-0">
                                <button onClick={() => openEdit(v)} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg"><Pencil size={15} /></button>
                                <button onClick={() => handleDelete(v.vehicle_id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-center">รหัส</th>
                                <th className="px-6 py-4 font-semibold">ป้ายทะเบียน</th>
                                <th className="px-6 py-4 font-semibold">ประเภท</th>
                                <th className="px-6 py-4 font-semibold">ยี่ห้อ / รุ่น</th>
                                <th className="px-6 py-4 font-semibold">ผู้รับผิดชอบ</th>
                                <th className="px-6 py-4 font-semibold text-right">รอบเครื่อง/ยาง</th>
                                <th className="px-6 py-4 font-semibold text-right">เลขไมล์ปัจจุบัน</th>
                                <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
                                <th className="px-6 py-4 font-semibold text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && <tr><td colSpan={9} className="text-center py-8 text-slate-400">กำลังโหลด...</td></tr>}
                            {!loading && vehicles.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-slate-400">ไม่พบข้อมูล</td></tr>}
                            {vehicles.map((v) => (
                                <tr key={v.vehicle_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-center text-slate-500">#{v.vehicle_id}</td>
                                    <td className="px-6 py-4 font-semibold text-slate-800">{v.license_plate}</td>
                                    <td className="px-6 py-4 text-slate-600">{v.vehicleType?.type_name || 'ไม่ระบุ'}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-800">{v.brand} {v.model}</div>
                                        <div className="text-xs text-slate-500">สี{v.color || '-'} / ปี {v.year || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{v.driver?.full_name || '-'}</td>
                                    <td className="px-6 py-4 text-right text-xs">
                                        <div className="text-slate-600">🛢️ {v.oil_change_interval_km?.toLocaleString() || v.vehicleType?.oil_change_interval_km?.toLocaleString() || '-'} กม.</div>
                                        <div className="text-slate-600">🛞 {v.tire_change_interval_km?.toLocaleString() || v.vehicleType?.tire_change_interval_km?.toLocaleString() || '-'} กม.</div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-800">{(v.current_mileage || 0).toLocaleString()} กม.</td>
                                    <td className="px-6 py-4 text-center"><StatusBadge status={v.status} /></td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <button onClick={() => openEdit(v)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded" title="แก้ไข"><Pencil size={15} /></button>
                                            <button onClick={() => handleDelete(v.vehicle_id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="ลบ"><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm">
                    <span className="text-slate-500">แสดง {vehicles.length} จากทั้งหมด {total} รายการ</span>
                    <div className="flex space-x-1">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50">ก่อนหน้า</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button key={p} onClick={() => setPage(p)} className={clsx('px-3 py-1 border rounded', page === p ? 'bg-blue-50 border-blue-500 text-blue-600 font-medium' : 'bg-white text-slate-700 hover:bg-slate-100')}>{p}</button>
                        ))}
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50">ถัดไป</button>
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

            {showModal && (
                <Modal title={editing ? 'แก้ไขยานพาหนะ' : 'เพิ่มยานพาหนะ'} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700">ป้ายทะเบียน *</label>
                                <input
                                    {...register('license_plate', {
                                        required: 'ระบุป้ายทะเบียน',
                                        pattern: { value: /.+-.+/, message: 'ต้องมีเครื่องหมาย - คั่น' }
                                    })}
                                    placeholder="เช่น กง-2345"
                                    className={clsx("mt-1 block w-full border rounded-lg px-3 py-2 text-sm focus:outline-none", errors.license_plate ? "border-red-500 focus:border-red-500" : "border-slate-300 focus:border-[#8A1ABA]")}
                                />
                                {errors.license_plate ? (
                                    <p className="text-xs text-red-500 mt-1">{errors.license_plate.message}</p>
                                ) : (
                                    <p className="text-xs text-slate-500 mt-1">กทม. ละเว้นชื่อจังหวัดได้ เช่น กง-1234</p>
                                )}
                            </div>
                            <div><label className="text-sm font-medium text-slate-700">ประเภทรถ *</label>
                                <select {...register('type_id', { required: true })} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                                    <option value="">เลือกประเภท</option>
                                    <option value="1">รถตู้ (Van)</option>
                                    <option value="2">รถกระบะ (Pickup)</option>
                                    <option value="3">รถเก๋ง (Sedan)</option>
                                    <option value="4">รถบัส (Bus)</option>
                                </select></div>
                            <div><label className="text-sm font-medium text-slate-700">ยี่ห้อ *</label>
                                <input {...register('brand', { required: true })} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" /></div>
                            <div><label className="text-sm font-medium text-slate-700">รุ่น *</label>
                                <input {...register('model', { required: true })} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" /></div>
                            <div><label className="text-sm font-medium text-slate-700">สี</label>
                                <input {...register('color')} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" /></div>
                            <div><label className="text-sm font-medium text-slate-700">ปีที่ผลิต *</label>
                                <input {...register('year', { required: true, valueAsNumber: true })} type="number" className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" /></div>
                            <div><label className="text-sm font-medium text-slate-700">ระยะถ่ายน้ำมันเครื่อง (กม.)</label>
                                <input {...register('oil_change_interval_km')} type="number" placeholder="ค่าเริ่มต้นตามประเภทรถ" className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-400" /></div>
                            <div><label className="text-sm font-medium text-slate-700">ระยะเปลี่ยนยาง (กม.)</label>
                                <input {...register('tire_change_interval_km')} type="number" placeholder="ค่าเริ่มต้นตามประเภทรถ" className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-400" /></div>
                            <div><label className="text-sm font-medium text-slate-700">สถานะ</label>
                                <select {...register('status')} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                                    <option value="READY">พร้อมใช้งาน</option>
                                    <option value="IN_REPAIR">กำลังซ่อม</option>
                                    <option value="INACTIVE">ปลดระวาง</option>
                                </select></div>
                            <div><label className="text-sm font-medium text-slate-700">ผู้รับผิดชอบ</label>
                                <select {...register('driver_id')} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                                    <option value="">ไม่ระบุ</option>
                                    {drivers.map(d => <option key={d.driver_id} value={d.driver_id}>{d.full_name}</option>)}
                                </select></div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">ยกเลิก</button>
                            <button type="submit" className="px-4 py-2 bg-[#8A1ABA] text-white rounded-lg text-sm font-medium hover:bg-[#72159c]">{editing ? 'บันทึกการแก้ไข' : 'เพิ่มยานพาหนะ'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
