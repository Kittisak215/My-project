import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Gauge, Car, Info, CheckCircle2, History } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../../lib/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/authStore';

const todayDate = new Date();

export default function MileagePage() {
    const { user } = useAuthStore();
    const [vehicles, setVehicles] = useState([]);
    const [logs, setLogs] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const { register, handleSubmit, watch, reset, control, formState: { errors } } = useForm({
        defaultValues: { recordDate: todayDate }
    });

    useEffect(() => {
        const driverId = user?.driver_id || user?.driver?.driver_id;
        api.get('/vehicles', { params: { limit: 100 } }).then(res => {
            const driverVehicles = res.data.data.filter(v => (v.driver_id || v.driverId) === driverId);
            setVehicles(driverVehicles);
            if (driverVehicles.length > 0) {
                setSelectedVehicle(driverVehicles[0]);
                fetchLogs(driverVehicles[0].vehicle_id || driverVehicles[0].id);
            }
        });
    }, [user?.driver_id, user?.driver?.driver_id]);

    const handleVehicleChange = (vehicleId) => {
        const v = vehicles.find(v => (v.vehicle_id || v.id) === parseInt(vehicleId));
        if (v) {
            setSelectedVehicle(v);
            fetchLogs(v.vehicle_id || v.id);
            reset();
        }
    };

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
                record_date: data.recordDate instanceof Date
                    ? data.recordDate.toISOString().slice(0, 10)
                    : data.recordDate,
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

    const currentMileage = selectedVehicle ? (selectedVehicle.current_mileage || selectedVehicle.currentMileage || 0) : 0;
    const watchedMileage = watch('mileage');
    const calculatedDistance = watchedMileage && parseInt(watchedMileage) >= currentMileage ? (parseInt(watchedMileage) - currentMileage) : 0;

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-purple-50 text-[#8A1ABA] rounded-2xl border border-purple-100/80">
                        <Gauge size={26} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">บันทึกระยะทาง</h1>
                        <p className="text-xs md:text-sm text-slate-500">อัปเดตเลขไมล์สำหรับยานพาหนะที่ได้รับมอบหมาย</p>
                    </div>
                </div>

                {vehicles.length > 1 && (
                    <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 p-1.5 rounded-xl border border-slate-200/80">
                        <span className="text-xs font-semibold text-slate-500 pl-2">คันที่เลือก:</span>
                        <select
                            value={selectedVehicle?.vehicle_id || selectedVehicle?.id || ''}
                            onChange={e => handleVehicleChange(e.target.value)}
                            className="text-xs font-bold text-[#8A1ABA] bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-200"
                        >
                            {vehicles.map(v => (
                                <option key={v.vehicle_id || v.id} value={v.vehicle_id || v.id}>
                                    {v.license_plate} ({v.brand} {v.model})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {!selectedVehicle ? (
                <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200 shadow-xs">
                    <Car size={48} className="mx-auto mb-3 text-slate-300" />
                    <p className="font-semibold text-slate-600">ยังไม่มียานพาหนะที่ได้รับมอบหมาย</p>
                    <p className="text-xs text-slate-400 mt-1">กรุณาติดต่อผู้ดูแลระบบ (Admin) เพื่อมอบหมายรถ</p>
                </div>
            ) : (
                <>
                    {/* Vehicle Quick Summary Card */}
                    <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 text-white rounded-2xl p-5 md:p-6 shadow-md relative overflow-hidden">
                        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="p-3 bg-white/15 rounded-xl backdrop-blur-md shrink-0">
                                    <Car size={24} className="text-teal-200" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-bold tracking-tight text-white">{selectedVehicle.license_plate}</h2>
                                        <span className="text-[11px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                                            {selectedVehicle.brand} {selectedVehicle.model}
                                        </span>
                                    </div>
                                    <p className="text-xs text-teal-200 mt-0.5">
                                        ต่อภาษีถึง: {selectedVehicle.tax_due_date ? new Date(selectedVehicle.tax_due_date).toLocaleDateString('th-TH') : '-'}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2.5 border border-white/10 self-start sm:self-auto min-w-[170px] text-right">
                                <p className="text-xs text-teal-200">เลขไมล์สะสมล่าสุด</p>
                                <p className="text-lg font-extrabold text-white">
                                    {currentMileage.toLocaleString()} <span className="text-xs font-normal text-teal-200">กม.</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Form Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 md:p-8">
                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#8A1ABA]"></span>
                            <h2 className="text-base md:text-lg font-bold text-slate-800">📌 ฟอร์มบันทึกเลขไมล์</h2>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        วันที่บันทึก *
                                    </label>
                                    <Controller
                                        name="recordDate"
                                        control={control}
                                        rules={{ required: true }}
                                        render={({ field }) => (
                                            <DatePicker
                                                selected={field.value}
                                                onChange={(date) => field.onChange(date)}
                                                maxDate={todayDate}
                                                dateFormat="dd/MM/yyyy"
                                                placeholderText="เลือกวันที่..."
                                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#8A1ABA]/20 focus:border-[#8A1ABA] bg-white"
                                                wrapperClassName="w-full"
                                                calendarClassName="shadow-xl rounded-xl border-0"
                                                showPopperArrow={false}
                                            />
                                        )}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
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
                                        placeholder={`ขั้นต่ำ ${currentMileage.toLocaleString()} กม.`}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8A1ABA]/20 focus:border-[#8A1ABA] bg-white"
                                    />
                                    {errors.mileage && (
                                        <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.mileage.message}</p>
                                    )}
                                </div>
                            </div>

                            {/* Distance Live Calculation */}
                            {watchedMileage && parseInt(watchedMileage) >= currentMileage && (
                                <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
                                        <div>
                                            <p className="text-xs text-emerald-800 font-medium">ระยะทางที่วิ่งตั้งแต่บันทึกครั้งที่แล้ว</p>
                                            <p className="text-lg font-bold text-emerald-700">+{calculatedDistance.toLocaleString()} กม.</p>
                                        </div>
                                    </div>
                                    <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold">
                                        คำนวณถูกต้อง
                                    </span>
                                </div>
                            )}

                            {/* Guide note */}
                            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-start gap-3 text-slate-600 text-xs leading-relaxed">
                                <Info size={18} className="text-purple-600 shrink-0 mt-0.5" />
                                <p>กรุณาตรวจสอบเลขไมล์จากหน้าปัดรถจริงให้ถูกต้องก่อนกดบันทึก ข้อมูลนี้จะนำไปใช้คำนวณรอบเปลี่ยนถ่ายน้ำมันเครื่องและเปลี่ยนยางโดยอัตโนมัติ</p>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-[#8A1ABA] hover:bg-[#72159c] text-white py-3.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md disabled:opacity-60 cursor-pointer"
                            >
                                {submitting ? 'กำลังบันทึก...' : '💾 บันทึกระยะทางสะสม'}
                            </button>
                        </form>
                    </div>

                    {/* History Table */}
                    {logs.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm md:text-base">
                                    <History size={18} className="text-[#8A1ABA]" />
                                    <span>ประวัติการบันทึกย้อนหลัง</span>
                                </h3>
                                <span className="text-xs text-slate-500 font-medium">{logs.length} รายการล่าสุด</span>
                            </div>

                            {/* Mobile Cards */}
                            <div className="sm:hidden divide-y divide-slate-100">
                                {logs.map(l => (
                                    <div key={l.mileage_id || l.id} className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{formatDate(l.record_date)}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{(l.mileage_start || 0).toLocaleString()} → {(l.mileage_end || 0).toLocaleString()} กม.</p>
                                        </div>
                                        <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                                            +{(l.distance_km || 0).toLocaleString()} กม.
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80">
                                        <tr>
                                            <th className="px-6 py-3.5 font-semibold">วันที่บันทึก</th>
                                            <th className="px-6 py-3.5 font-semibold text-right">ไมล์ก่อนหน้า</th>
                                            <th className="px-6 py-3.5 font-semibold text-right">ไมล์ที่บันทึก</th>
                                            <th className="px-6 py-3.5 font-semibold text-right">ระยะทางเพิ่ม (+กม.)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {logs.map(l => (
                                            <tr key={l.mileage_id || l.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-800">{formatDate(l.record_date)}</td>
                                                <td className="px-6 py-4 text-right text-slate-600">{(l.mileage_start || 0).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right text-slate-800 font-semibold">{(l.mileage_end || 0).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right text-emerald-600 font-extrabold">+{(l.distance_km || 0).toLocaleString()}</td>
                                            </tr>
                                        ))}
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
