import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Gauge, Car, Calendar, Info, CheckCircle2, History } from 'lucide-react';
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
        try {
            const res = await api.get(`/mileage/${vid}`);
            setLogs(res.data);
        } catch {
            // silent fail
        }
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
        } catch (err) {
            toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึก');
        }
        setSubmitting(false);
    };

    const thisMonth = new Date().toISOString().slice(0, 7);
    const currentMileage = selectedVehicle ? (selectedVehicle.current_mileage || selectedVehicle.currentMileage || 0) : 0;
    const watchedMileage = watch('mileage');
    const calculatedDistance = watchedMileage && parseInt(watchedMileage) >= currentMileage ? (parseInt(watchedMileage) - currentMileage) : 0;

    return (
        <div className="w-full space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-50 text-[#8A1ABA] rounded-2xl border border-purple-100">
                        <Gauge size={26} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-800">บันทึกระยะทาง</h1>
                        <p className="text-xs md:text-sm text-slate-500">อัปเดตเลขไมล์ประจำเดือนสำหรับยานพาหนะที่ได้รับมอบหมาย</p>
                    </div>
                </div>
            </div>

            {!selectedVehicle ? (
                <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200 shadow-xs">
                    <Car size={48} className="mx-auto mb-3 text-slate-300" />
                    <p className="font-semibold text-slate-600">ยังไม่มียานพาหนะที่ได้รับมอบหมาย</p>
                    <p className="text-xs text-slate-400 mt-1">กรุณาติดต่อผู้ดูแลระบบ (Admin) เพื่อมอบหมายรถ</p>
                </div>
            ) : (
                <>
                    {/* 2-Column Grid Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* Left Column: Form (7 cols) */}
                        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 md:p-8 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#8A1ABA]"></span>
                                    <h2 className="text-lg font-bold text-slate-800">📌 บันทึกเลขไมล์ประจำเดือน</h2>
                                </div>

                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                                ประจำเดือน *
                                            </label>
                                            <input
                                                {...register('recordMonth', { required: true })}
                                                type="month"
                                                defaultValue={thisMonth}
                                                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8A1ABA]/20 focus:border-[#8A1ABA]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                                เลขไมล์ปัจจุบัน (กม.) *
                                            </label>
                                            <input
                                                {...register('mileage', {
                                                    required: 'กรุณากรอกเลขไมล์',
                                                    min: {
                                                        value: currentMileage,
                                                        message: `ต้องไม่น้อยกว่า ${currentMileage.toLocaleString()} กม.`
                                                    }
                                                })}
                                                type="number"
                                                placeholder={`ขั้นต่ำ ${currentMileage.toLocaleString()}`}
                                                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8A1ABA]/20 focus:border-[#8A1ABA]"
                                            />
                                            {errors.mileage && (
                                                <p className="text-red-500 text-xs mt-1 font-medium">{errors.mileage.message}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Distance Live Calc Card */}
                                    {watchedMileage && parseInt(watchedMileage) >= currentMileage && (
                                        <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <CheckCircle2 size={20} className="text-emerald-600" />
                                                <div>
                                                    <p className="text-xs text-emerald-800 font-medium">ระยะทางที่วิ่งในงวดนี้</p>
                                                    <p className="text-lg font-bold text-emerald-700">+{calculatedDistance.toLocaleString()} กม.</p>
                                                </div>
                                            </div>
                                            <span className="text-xs bg-emerald-200/60 text-emerald-800 px-2.5 py-1 rounded-full font-semibold">
                                                ถูกต้อง
                                            </span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full bg-[#8A1ABA] hover:bg-[#72159c] text-white py-3 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md disabled:opacity-60 cursor-pointer"
                                    >
                                        {submitting ? 'กำลังบันทึก...' : 'บันทึกระยะทางสะสม'}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Right Column: Vehicle Summary & Guidelines (5 cols) */}
                        <div className="lg:col-span-5 space-y-6">
                            {/* Vehicle Card */}
                            <div className="bg-gradient-to-br from-teal-800 via-teal-700 to-teal-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                                <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-white/15 rounded-xl backdrop-blur-md">
                                        <Car size={24} className="text-teal-200" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-teal-200 uppercase font-semibold tracking-wider">ยานพาหนะของคุณ</p>
                                        <h3 className="text-xl font-bold text-white">{selectedVehicle.license_plate}</h3>
                                    </div>
                                </div>

                                <p className="text-sm text-teal-100 font-medium mb-4">{selectedVehicle.brand} {selectedVehicle.model}</p>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
                                        <p className="text-xs text-teal-200 font-medium mb-0.5">เลขไมล์ล่าสุด</p>
                                        <p className="text-lg font-bold text-white">{currentMileage.toLocaleString()} <span className="text-xs font-normal">กม.</span></p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
                                        <p className="text-xs text-teal-200 font-medium mb-0.5">ต่อภาษีถึง</p>
                                        <p className="text-sm font-bold text-white mt-1">
                                            {selectedVehicle.tax_due_date ? new Date(selectedVehicle.tax_due_date).toLocaleDateString('th-TH') : '-'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Guidelines Card */}
                            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 text-slate-700">
                                <h3 className="font-semibold text-amber-900 text-sm flex items-center gap-2 mb-2">
                                    <Info size={18} className="text-amber-600" /> คำแนะนำการบันทึกเลขไมล์
                                </h3>
                                <ul className="text-xs space-y-2 text-slate-600 list-disc list-inside">
                                    <li>บันทึกเลขไมล์อย่างน้อยเดือนละ 1 ครั้งเมื่อสิ้นสุดงวด</li>
                                    <li>ตรวจสอบเลขไมล์จากหน้าปัดรถให้ถูกต้องก่อนกดยืนยัน</li>
                                    <li>ระบบจะแจ้งเตือนบำรุงรักษาอัตโนมัติเมื่อระยะทางสะสมถึงเกณฑ์กำหนด</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Full-width History Section */}
                    {logs.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                    <History size={18} className="text-[#8A1ABA]" />
                                    <span>ประวัติการบันทึกย้อนหลัง</span>
                                </h2>
                                <span className="text-xs text-slate-500 font-medium">{logs.length} รายการล่าสุด</span>
                            </div>

                            {/* Mobile Cards */}
                            <div className="sm:hidden divide-y divide-slate-100">
                                {logs.map(l => {
                                    const rDate = new Date(l.record_month || l.recordMonth);
                                    const mStr = isNaN(rDate) ? (l.record_month || l.recordMonth) : `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}`;
                                    return (
                                        <div key={l.log_id || l.id} className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-slate-800">{mStr}</p>
                                                <p className="text-xs text-slate-500">{(l.mileage_start || 0).toLocaleString()} → {(l.mileage_end || l.mileage || 0).toLocaleString()} กม.</p>
                                            </div>
                                            <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                                                +{(l.distance_km || l.distance || 0).toLocaleString()} กม.
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80">
                                        <tr>
                                            <th className="px-6 py-3.5 font-semibold">เดือน</th>
                                            <th className="px-6 py-3.5 font-semibold text-right">ไมล์ก่อนหน้า</th>
                                            <th className="px-6 py-3.5 font-semibold text-right">ไมล์ที่บันทึก</th>
                                            <th className="px-6 py-3.5 font-semibold text-right">ระยะทางสะสมเพิ่ม (+กม.)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {logs.map(l => {
                                            const rDate = new Date(l.record_month || l.recordMonth);
                                            const mStr = isNaN(rDate) ? (l.record_month || l.recordMonth) : `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}`;
                                            return (
                                                <tr key={l.log_id || l.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-slate-800">{mStr}</td>
                                                    <td className="px-6 py-4 text-right text-slate-600">{(l.mileage_start || l.previousMileage || 0).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right text-slate-800 font-semibold">{(l.mileage_end || l.mileage || 0).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right text-emerald-600 font-extrabold">+{(l.distance_km || l.distance || 0).toLocaleString()}</td>
                                                </tr>
                                            );
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
