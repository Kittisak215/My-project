import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../lib/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/authStore';

export default function MileagePage() {
    const { user } = useAuthStore();
    const [vehicles, setVehicles] = useState([]);
    const [logs, setLogs] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const { register, handleSubmit, watch, reset, formState: { errors } } = useForm();

    useEffect(() => {
        api.get('/vehicles', { params: { limit: 100 } }).then(res => {
            const driverId = user?.driver_id || user?.driver?.driver_id;
            const driverVehicles = res.data.data.filter(v => (v.driver_id || v.driverId) === driverId);
            setVehicles(driverVehicles);
            if (driverVehicles.length > 0) {
                setSelectedVehicle(driverVehicles[0]);
                fetchLogs(driverVehicles[0].vehicle_id || driverVehicles[0].id);
            }
        });
    }, []);

    const fetchLogs = async (vid) => {
        const res = await api.get(`/mileage/${vid}`);
        setLogs(res.data);
    };

    const onSubmit = async (data) => {
        if (!selectedVehicle) return;
        setSubmitting(true);
        try {
            await api.post('/mileage', {
                vehicle_id: selectedVehicle.vehicle_id || selectedVehicle.id,
                record_month: data.recordMonth,
                mileage_end: parseInt(data.mileage)
            });
            toast.success('บันทึกระยะทางสำเร็จ!');
            reset();
            fetchLogs(selectedVehicle.vehicle_id || selectedVehicle.id);
        } catch (err) { toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด'); }
        setSubmitting(false);
    };

    const thisMonth = new Date().toISOString().slice(0, 7);

    return (
        <div className="max-w-2xl w-full">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">📊 บันทึกระยะทาง</h1>

            {!selectedVehicle ? (
                <div className="bg-white rounded-xl p-8 text-center text-slate-400 border border-slate-200">ยังไม่มียานพาหนะที่ได้รับมอบหมาย</div>
            ) : (
                <>
                    <div className="bg-teal-700 text-white rounded-2xl p-5 mb-6 shadow-md">
                        <p className="text-teal-200 text-sm">ยานพาหนะของคุณ</p>
                        <p className="text-xl font-bold">{selectedVehicle.license_plate}</p>
                        <p className="text-teal-200 text-sm">{selectedVehicle.brand} {selectedVehicle.model}</p>
                        <div className="mt-3 bg-white/10 rounded-lg p-3">
                            <p className="text-teal-200 text-sm">เลขไมล์ล่าสุด</p>
                            <p className="text-2xl font-bold">{(selectedVehicle.current_mileage || selectedVehicle.currentMileage || 0).toLocaleString()} กม.</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">📌 บันทึกเลขไมล์ประจำเดือน</h2>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><label className="text-sm font-medium text-slate-700">ประจำเดือน *</label>
                                    <input {...register('recordMonth', { required: true })} type="month" defaultValue={thisMonth} className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" /></div>
                                <div><label className="text-sm font-medium text-slate-700">เลขไมล์ปัจจุบัน (กม.) *</label>
                                    <input {...register('mileage', {
                                        required: 'กรุณากรอกเลขไมล์',
                                        min: {
                                            value: selectedVehicle.current_mileage || selectedVehicle.currentMileage || 0,
                                            message: `ต้องตั้งแต่ ${(selectedVehicle.current_mileage || selectedVehicle.currentMileage || 0).toLocaleString()} ขึ้นไป`
                                        }
                                    })}
                                        type="number" placeholder={`ขั้นต่ำ ${(selectedVehicle.current_mileage || selectedVehicle.currentMileage || 0).toLocaleString()}`}
                                        className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" />
                                    {errors.mileage && <p className="text-red-500 text-xs mt-1">{errors.mileage.message}</p>}
                                </div>
                            </div>
                            {watch('mileage') && parseInt(watch('mileage')) >= (selectedVehicle.current_mileage || selectedVehicle.currentMileage || 0) && (
                                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm">
                                    <p className="text-teal-700">ระยะทางที่วิ่ง: <strong>{(parseInt(watch('mileage')) - (selectedVehicle.current_mileage || selectedVehicle.currentMileage || 0)).toLocaleString()} กม.</strong></p>
                                </div>
                            )}
                            <button type="submit" disabled={submitting} className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                                {submitting ? 'กำลังบันทึก...' : '💾 บันทึกระยะทาง'}
                            </button>
                        </form>
                    </div>

                    {logs.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-4 md:px-6 py-4 border-b bg-slate-50"><h2 className="font-semibold text-slate-800">ประวัติการบันทึกย้อนหลัง</h2></div>
                            {/* Mobile Cards */}
                            <div className="sm:hidden divide-y divide-slate-100">
                                {logs.map(l => {
                                    const rDate = new Date(l.record_month || l.recordMonth);
                                    const mStr = isNaN(rDate) ? (l.record_month || l.recordMonth) : `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}`;
                                    return (
                                        <div key={l.log_id || l.id} className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-slate-800">{mStr}</p>
                                                <p className="text-xs text-slate-500">{(l.mileage_start || 0).toLocaleString()} → {(l.mileage_end || l.mileage || 0).toLocaleString()} กม.</p>
                                            </div>
                                            <span className="text-orange-500 font-bold">+{(l.distance_km || l.distance || 0).toLocaleString()} กม.</span>
                                        </div>
                                    )
                                })}
                            </div>
                            {/* Desktop Table */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-600"><tr>
                                        <th className="px-6 py-3 text-left">เดือน</th>
                                        <th className="px-6 py-3 text-right">ไมล์ก่อนหน้า</th>
                                        <th className="px-6 py-3 text-right">ไมล์ที่บันทึก</th>
                                        <th className="px-6 py-3 text-right">ระยะทาง (+กม.)</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {logs.map(l => {
                                            const rDate = new Date(l.record_month || l.recordMonth);
                                            const mStr = isNaN(rDate) ? (l.record_month || l.recordMonth) : `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}`;
                                            return (
                                                <tr key={l.log_id || l.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 font-medium">{mStr}</td>
                                                    <td className="px-6 py-4 text-right text-slate-600">{(l.mileage_start || l.previousMileage || 0).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right text-slate-800 font-semibold">{(l.mileage_end || l.mileage).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right text-orange-500 font-bold">+{(l.distance_km || l.distance || 0).toLocaleString()}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
