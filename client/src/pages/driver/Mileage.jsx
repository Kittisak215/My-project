import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Gauge, Car, Info, CheckCircle2, History, AlertTriangle, AlertCircle, Wrench, ArrowRight } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../../lib/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/authStore';

const todayDate = new Date();

const typeLabelMap = {
    'OIL_CHANGE': 'เปลี่ยนถ่ายน้ำมันเครื่อง',
    'TIRE_CHANGE': 'เปลี่ยนยาง'
};

export default function MileagePage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [logs, setLogs] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [vehicleForecasts, setVehicleForecasts] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [postSubmitModal, setPostSubmitModal] = useState(null);

    const { register, handleSubmit, watch, reset, control, formState: { errors } } = useForm({
        defaultValues: { recordDate: todayDate }
    });

    const fetchForecast = async (vid) => {
        try {
            const res = await api.get('/alerts/forecast', { params: { vehicle_id: vid } });
            if (Array.isArray(res.data)) {
                const target = res.data.find(item => item.vehicle?.vehicle_id === vid) || res.data[0];
                setVehicleForecasts(target?.forecasts || []);
            }
        } catch {
            // silent fail
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

    useEffect(() => {
        const driverId = user?.driver_id || user?.driver?.driver_id;
        api.get('/vehicles', { params: { limit: 100, is_active: "true" } }).then(res => {
            const driverVehicles = res.data.data.filter(v => (v.driver_id || v.driverId) === driverId);
            setVehicles(driverVehicles);
            if (driverVehicles.length > 0) {
                const initialV = driverVehicles[0];
                const vid = initialV.vehicle_id || initialV.id;
                setSelectedVehicle(initialV);
                fetchLogs(vid);
                fetchForecast(vid);
            }
        });
    }, [user?.driver_id, user?.driver?.driver_id]);

    const handleVehicleChange = (vehicleId) => {
        const v = vehicles.find(v => (v.vehicle_id || v.id) === parseInt(vehicleId));
        if (v) {
            const vid = v.vehicle_id || v.id;
            setSelectedVehicle(v);
            fetchLogs(vid);
            fetchForecast(vid);
            reset();
        }
    };

    const currentMileage = logs.length > 0 
        ? logs[0].mileage_end 
        : (selectedVehicle ? (selectedVehicle.current_mileage || selectedVehicle.currentMileage || 0) : 0);

    const watchedMileage = watch('mileage');
    const enteredMileage = watchedMileage && !isNaN(parseInt(watchedMileage)) ? parseInt(watchedMileage) : null;
    const isMileageValid = enteredMileage !== null && enteredMileage >= currentMileage;
    const calculatedDistance = isMileageValid ? (enteredMileage - currentMileage) : 0;

    // Calculate live maintenance alerts for entered mileage
    const liveMaintenanceAlerts = (isMileageValid && vehicleForecasts.length > 0) 
        ? vehicleForecasts.map(f => {
            const remaining = f.next_service_mileage - enteredMileage;
            return {
                ...f,
                remaining,
                isOverdue: remaining <= 0,
                isWarning: remaining > 0 && remaining <= 1000,
            };
        })
        : [];

    const hasOverdue = liveMaintenanceAlerts.some(a => a.isOverdue);
    const hasWarning = liveMaintenanceAlerts.some(a => a.isWarning);
    const criticalAlerts = liveMaintenanceAlerts.filter(a => a.isOverdue || a.isWarning);

    const onFormError = (formErrors) => {
        const firstErr = Object.values(formErrors)[0]?.message;
        if (firstErr) toast.error(firstErr);
    };

    const onSubmit = async (data) => {
        if (!selectedVehicle) {
            toast.error("ไม่พบข้อมูลยานพาหนะที่เลือก");
            return;
        }
        setSubmitting(true);
        try {
            const d = data.recordDate instanceof Date ? data.recordDate : new Date(data.recordDate);
            const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            const res = await api.post('/mileage', {
                vehicle_id: selectedVehicle.vehicle_id || selectedVehicle.id,
                record_date: localDate,
                mileage_end: parseInt(data.mileage),
                recorded_by: user?.driver_id || selectedVehicle?.driver_id,
            });

            // ตรวจสอบว่ามี warning หลังเซฟหรือไม่ (ทั้งจาก backend และจาก live calculation)
            const hasServerWarnings = res.data.maintenanceWarnings && res.data.maintenanceWarnings.length > 0;
            const hasTriggered = res.data.triggeredAlerts && res.data.triggeredAlerts.length > 0;

            if (hasServerWarnings || hasTriggered || criticalAlerts.length > 0) {
                const warnings = hasServerWarnings 
                    ? res.data.maintenanceWarnings 
                    : criticalAlerts.map(a => ({
                        type: a.type,
                        next_service_mileage: a.next_service_mileage,
                        remaining_mileage: a.remaining,
                        is_overdue: a.isOverdue,
                        overdue_by: a.isOverdue ? Math.abs(a.remaining) : 0
                    }));

                const isAnyOverdue = warnings.some(w => w.is_overdue);

                setPostSubmitModal({
                    show: true,
                    hasOverdue: isAnyOverdue,
                    warnings,
                    savedMileage: parseInt(data.mileage)
                });

                if (isAnyOverdue) {
                    toast.warn('บันทึกสำเร็จ! 🚨 มีรายการบำรุงรักษาที่เลยกำหนด', { autoClose: 5000 });
                } else {
                    toast.info('บันทึกสำเร็จ! ⚠️ มีรายการที่ใกล้ถึงรอบบำรุงรักษา (เหลือน้อยกว่า 1,000 กม.)', { autoClose: 5000 });
                }
            } else {
                toast.success('บันทึกระยะทางสำเร็จ!');
            }
            
            reset();
            const vid = selectedVehicle.vehicle_id || selectedVehicle.id;
            fetchLogs(vid);
            fetchForecast(vid);
        } catch (err) {
            toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึก');
        }
        setSubmitting(false);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            {/* Header & Vehicle Selector */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-purple-50 text-[#8A1ABA] rounded-2xl border border-purple-100/80 shrink-0">
                        <Gauge size={26} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">บันทึกระยะทาง</h1>
                        <p className="text-xs md:text-sm text-slate-500">อัปเดตเลขไมล์สำหรับยานพาหนะที่ได้รับมอบหมาย</p>
                    </div>
                </div>

                {vehicles.length > 1 && (
                    <div className="pt-4 border-t border-slate-100">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            เลือกรถที่ต้องการบันทึก
                        </label>
                        <div className="relative">
                            <select
                                value={selectedVehicle?.vehicle_id || selectedVehicle?.id || ''}
                                onChange={e => handleVehicleChange(e.target.value)}
                                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 font-bold text-sm md:text-base rounded-xl px-4 py-3.5 pr-10 focus:outline-none focus:ring-2 focus:ring-[#8A1ABA]/30 focus:border-[#8A1ABA] transition-all cursor-pointer"
                            >
                                {vehicles.map(v => (
                                    <option key={v.vehicle_id || v.id} value={v.vehicle_id || v.id}>
                                        🚗 {v.license_plate} ({v.brand} {v.model})
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
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
                    <div 
                        className="text-white rounded-2xl p-5 md:p-6 relative overflow-hidden"
                        style={{
                            background: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #3b0764 100%)',
                            boxShadow: '0 10px 30px -10px rgba(124,58,237,0.4)'
                        }}
                    >
                        {/* Ambient glow blobs */}
                        <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20"
                            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.8), transparent 70%)' }} />
                        <div className="pointer-events-none absolute -bottom-16 -left-10 w-56 h-56 rounded-full opacity-20"
                            style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.6), transparent 70%)' }} />
                            
                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md shrink-0 border border-white/10">
                                    <Car size={24} className="text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-bold tracking-tight text-white">{selectedVehicle.license_plate}</h2>
                                        <span className="text-[11px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                                            {selectedVehicle.brand} {selectedVehicle.model}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2.5 border border-white/15 self-start sm:self-auto min-w-[170px] text-left sm:text-right">
                                <p className="text-xs text-violet-200 font-medium">เลขไมล์สะสมล่าสุด</p>
                                <p className="text-lg font-extrabold text-white">
                                    {currentMileage.toLocaleString()} <span className="text-xs font-normal text-violet-200">กม.</span>
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

                        <form onSubmit={handleSubmit(onSubmit, onFormError)} className="space-y-6">
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
                                        min={currentMileage}
                                        step="1"
                                        onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                                        placeholder={`ขั้นต่ำ ${currentMileage.toLocaleString()} กม.`}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8A1ABA]/20 focus:border-[#8A1ABA] bg-white"
                                    />
                                    {errors.mileage && (
                                        <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.mileage.message}</p>
                                    )}
                                </div>
                            </div>

                            {/* Distance Live Calculation */}
                            {isMileageValid && (
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

                            {/* Real-time Maintenance Live Alert */}
                            {isMileageValid && vehicleForecasts.length > 0 && (
                                <div className="space-y-3">
                                    {hasOverdue ? (
                                        <div className="bg-rose-50 border-2 border-rose-300/90 rounded-2xl p-4 md:p-5 shadow-xs transition-all">
                                            <div className="flex items-start gap-3.5">
                                                <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl shrink-0 mt-0.5">
                                                    <AlertCircle size={22} />
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                                        <h4 className="font-bold text-rose-900 text-sm md:text-base flex items-center gap-2">
                                                            🚨 แจ้งเตือน: เลยกำหนดรอบบำรุงรักษาแล้ว!
                                                        </h4>
                                                        <span className="text-[11px] font-bold bg-rose-200 text-rose-900 px-2.5 py-0.5 rounded-full">
                                                            ต้องเข้าศูนย์บริการทันที
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-rose-700 leading-relaxed">
                                                        เลขไมล์ที่คุณระบุทำให้รถคันนี้วิ่งเลยกำหนดรอบซ่อมบำรุง กรุณานำรถเข้าตรวจเช็คโดยด่วน
                                                    </p>
                                                    <div className="space-y-1.5 pt-1">
                                                        {criticalAlerts.map((item, idx) => (
                                                            <div key={idx} className="bg-white/80 border border-rose-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                                                                <div className="flex items-center gap-2">
                                                                    <Wrench size={14} className="text-rose-600" />
                                                                    <span className="font-bold text-slate-800">
                                                                        {typeLabelMap[item.type] || item.type}
                                                                    </span>
                                                                    <span className="text-slate-500 text-[11px]">
                                                                        (รอบที่ {item.next_service_mileage.toLocaleString()} กม.)
                                                                    </span>
                                                                </div>
                                                                <span className="font-extrabold text-rose-600">
                                                                    {item.isOverdue 
                                                                        ? `เลยกำหนดมาแล้ว ${Math.abs(item.remaining).toLocaleString()} กม.`
                                                                        : `เหลืออีก ${item.remaining.toLocaleString()} กม.`}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : hasWarning ? (
                                        <div className="bg-amber-50 border-2 border-amber-300/90 rounded-2xl p-4 md:p-5 shadow-xs transition-all">
                                            <div className="flex items-start gap-3.5">
                                                <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
                                                    <AlertTriangle size={22} />
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                                        <h4 className="font-bold text-amber-950 text-sm md:text-base flex items-center gap-2">
                                                            ⚠️ แจ้งเตือน: ใกล้ถึงรอบบำรุงรักษา (เหลือน้อยกว่า 1,000 กม.)
                                                        </h4>
                                                        <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
                                                            เตรียมวางแผนเข้าศูนย์
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-amber-800 leading-relaxed">
                                                        ระบบตรวจพบว่ามีรายการที่ใกล้ถึงรอบเปลี่ยน กรุณาเตรียมแจ้งซ่อมบำรุงล่วงหน้า
                                                    </p>
                                                    <div className="space-y-1.5 pt-1">
                                                        {criticalAlerts.map((item, idx) => (
                                                            <div key={idx} className="bg-white/80 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                                                                <div className="flex items-center gap-2">
                                                                    <Wrench size={14} className="text-amber-700" />
                                                                    <span className="font-bold text-slate-800">
                                                                        {typeLabelMap[item.type] || item.type}
                                                                    </span>
                                                                    <span className="text-slate-500 text-[11px]">
                                                                        (รอบที่ {item.next_service_mileage.toLocaleString()} กม.)
                                                                    </span>
                                                                </div>
                                                                <span className="font-extrabold text-amber-700">
                                                                    เหลืออีก {item.remaining.toLocaleString()} กม.
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2.5 text-slate-600">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                                                <span>สถานะรอบบำรุงรักษาปกติ:</span>
                                                <span className="font-medium text-slate-700">
                                                    {liveMaintenanceAlerts.map(a => `${typeLabelMap[a.type] || a.type} อีก ${a.remaining.toLocaleString()} กม.`).join(' • ')}
                                                </span>
                                            </div>
                                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md shrink-0">
                                                ปกติ
                                            </span>
                                        </div>
                                    )}
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
                                {submitting ? 'กำลังบันทึก...' : 'บันทึกระยะทางสะสม'}
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

            {/* Post-Submit Maintenance Warning Dialog */}
            {postSubmitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-7 shadow-2xl border border-slate-100 relative text-center space-y-4">
                        <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${
                            postSubmitModal.hasOverdue 
                                ? 'bg-rose-100 text-rose-600' 
                                : 'bg-amber-100 text-amber-600'
                        }`}>
                            {postSubmitModal.hasOverdue ? <AlertCircle size={36} /> : <AlertTriangle size={36} />}
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-slate-800">
                                {postSubmitModal.hasOverdue ? '🚨 เลยกำหนดรอบบำรุงรักษา!' : '⚠️ ใกล้ถึงรอบบำรุงรักษาแล้ว!'}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                บันทึกเลขไมล์สำเร็จเรียบร้อย ({postSubmitModal.savedMileage?.toLocaleString()} กม.) แต่ระบบตรวจพบรายการที่ต้องดูแล:
                            </p>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2.5">
                            {postSubmitModal.warnings?.map((w, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60 last:border-b-0 last:pb-0">
                                    <div className="flex items-center gap-2">
                                        <Wrench size={15} className={w.is_overdue ? "text-rose-600" : "text-amber-600"} />
                                        <span className="font-bold text-slate-700">{typeLabelMap[w.type] || w.type}</span>
                                    </div>
                                    <span className={`font-extrabold ${w.is_overdue ? "text-rose-600" : "text-amber-600"}`}>
                                        {w.is_overdue 
                                            ? `เกินกำหนด ${(w.overdue_by || Math.abs(w.remaining_mileage)).toLocaleString()} กม.` 
                                            : `เหลืออีก ${(w.remaining_mileage || 0).toLocaleString()} กม.`}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <p className="text-[11px] text-slate-500">
                            คุณต้องการทำรายการแจ้งซ่อมบำรุงสำหรับรถทะเบียน <span className="font-bold text-slate-700">{selectedVehicle?.license_plate}</span> ตอนนี้เลยหรือไม่?
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setPostSubmitModal(null)}
                                className="w-full sm:w-1/2 py-3 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                            >
                                รับทราบ (ปิดหน้าต่าง)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setPostSubmitModal(null);
                                    navigate('/driver/repair');
                                }}
                                className="w-full sm:w-1/2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#8A1ABA] hover:bg-[#72159c] transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                <span>แจ้งซ่อมบำรุงตอนนี้</span>
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
