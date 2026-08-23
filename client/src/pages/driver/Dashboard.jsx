import { useEffect, useState } from 'react';
import { Car, Wrench, AlertCircle, ChevronLeft, ChevronRight, Gauge, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import api from '../../lib/axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import clsx from 'clsx';

export default function DriverDashboard() {
    const { user } = useAuthStore();
    const [vehicles, setVehicles] = useState([]);
    const [repairs, setRepairs] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIdx, setSelectedIdx] = useState(0);

    useEffect(() => {
        const driverId = user?.driver_id || user?.driver?.driver_id;
        Promise.all([
            api.get('/vehicles', { params: { limit: 100 } }),
            api.get('/repairs', { params: { limit: 5 } }),
            api.get('/alerts')
        ])
            .then(([vRes, rRes, aRes]) => {
                const driverVehicles = vRes.data.data.filter(v => (v.driver_id || v.driverId) === driverId);
                const vehicleIds = driverVehicles.map(v => v.vehicle_id);
                setVehicles(driverVehicles);
                setRepairs(rRes.data.data.filter(r => vehicleIds.includes(r.vehicle_id)));
                setAlerts(aRes.data.filter(a => a.status !== 'DONE' && vehicleIds.includes(a.vehicle_id)).slice(0, 5));
            })
            .catch(() => toast.error('โหลดข้อมูลไม่สำเร็จ'))
            .finally(() => setLoading(false));
    }, [user?.driver_id, user?.driver?.driver_id]);

    const displayName = user?.full_name || user?.driver?.full_name || user?.username;
    const vehicle = vehicles[selectedIdx];

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            {/* Top Welcome & Vehicle Hero Card */}
            <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 text-white rounded-2xl p-6 md:p-8 shadow-md relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <p className="text-teal-200 text-xs md:text-sm font-medium">ยินดีต้อนรับสู่ระบบ</p>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-0.5">{displayName}</h1>
                    </div>

                    {/* Multi-vehicle switcher button */}
                    {vehicles.length > 1 && (
                        <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-xl self-start sm:self-auto border border-white/15">
                            <button
                                onClick={() => setSelectedIdx(i => Math.max(0, i - 1))}
                                disabled={selectedIdx === 0}
                                className="p-1 rounded-lg disabled:opacity-30 hover:bg-white/15 transition-colors cursor-pointer"
                                title="คันก่อนหน้า"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="text-xs font-bold text-white px-1">
                                รถคันที่ {selectedIdx + 1} / {vehicles.length}
                            </span>
                            <button
                                onClick={() => setSelectedIdx(i => Math.min(vehicles.length - 1, i + 1))}
                                disabled={selectedIdx === vehicles.length - 1}
                                className="p-1 rounded-lg disabled:opacity-30 hover:bg-white/15 transition-colors cursor-pointer"
                                title="คันถัดไป"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                </div>

                {vehicles.length === 0 ? (
                    <div className="bg-white/10 rounded-xl p-5 text-teal-100 text-sm border border-white/10">
                        ยังไม่มียานพาหนะที่ได้รับมอบหมาย กรุณาติดต่อผู้ดูแลระบบ (Admin)
                    </div>
                ) : (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/10">
                            <div className="flex items-center gap-3.5">
                                <div className="p-3 bg-white/20 rounded-xl shadow-xs shrink-0">
                                    <Car size={26} className="text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="font-bold text-xl text-white">{vehicle.license_plate}</h2>
                                        <span className="text-xs bg-white/20 text-teal-100 px-2.5 py-0.5 rounded-full font-medium">
                                            {vehicle.brand} {vehicle.model}
                                        </span>
                                    </div>
                                    <p className="text-xs text-teal-200 mt-1">
                                        ต่อภาษีถึง: {vehicle.tax_due_date ? new Date(vehicle.tax_due_date).toLocaleDateString('th-TH') : '-'}
                                    </p>
                                </div>
                            </div>

                            <span className={clsx('px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto shadow-xs',
                                vehicle.status === 'READY' ? 'bg-emerald-400 text-emerald-950' : 'bg-amber-300 text-amber-950')}>
                                {vehicle.status === 'READY' ? '🟢 พร้อมใช้งาน' : '🛠️ กำลังซ่อมบำรุง'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-white/10 p-3 rounded-xl">
                                <p className="text-xs text-teal-200 font-medium">เลขไมล์สะสมปัจจุบัน</p>
                                <p className="font-extrabold text-lg text-white mt-0.5">
                                    {(vehicle.current_mileage || 0).toLocaleString()} <span className="text-xs font-normal text-teal-200">กม.</span>
                                </p>
                            </div>
                            <div className="bg-white/10 p-3 rounded-xl">
                                <p className="text-xs text-teal-200 font-medium">สถานะเครื่องยนต์</p>
                                <p className="font-bold text-base text-white mt-0.5">
                                    {vehicle.status === 'READY' ? 'ปกติ สมบูรณ์' : 'อยู่ระหว่างตรวจเช็ก'}
                                </p>
                            </div>
                        </div>

                        {/* Vehicle dots switcher */}
                        {vehicles.length > 1 && (
                            <div className="flex justify-center gap-1.5 mt-4">
                                {vehicles.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedIdx(i)}
                                        className={clsx('h-1.5 rounded-full transition-all cursor-pointer', i === selectedIdx ? 'bg-white w-6' : 'bg-white/40 w-2')}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Maintenance Alerts Section */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <AlertCircle size={20} className="text-amber-500" />
                        <span>การแจ้งเตือนรอบบำรุงรักษา</span>
                    </h2>
                    {alerts.length > 0 && (
                        <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            {alerts.length} รายการ
                        </span>
                    )}
                </div>

                {alerts.length > 0 ? (
                    <div className="space-y-3">
                        {alerts.map(a => (
                            <div key={a.alert_id} className={clsx('p-4 rounded-xl border-l-4 flex items-start justify-between gap-3', a.status === 'OVERDUE' ? 'bg-red-50/80 border-red-500' : 'bg-amber-50/80 border-amber-400')}>
                                <div className="flex items-start gap-3">
                                    <AlertCircle size={20} className={a.status === 'OVERDUE' ? 'text-red-500 shrink-0 mt-0.5' : 'text-amber-500 shrink-0 mt-0.5'} />
                                    <div>
                                        <p className={clsx('font-bold text-sm', a.status === 'OVERDUE' ? 'text-red-900' : 'text-amber-900')}>{a.alert_type}</p>
                                        <p className="text-xs text-slate-600 mt-0.5">กำหนดเปลี่ยนถ่ายที่ระยะ {(a.next_service_mileage || 0).toLocaleString()} กม.</p>
                                        {a.vehicle?.license_plate && (
                                            <p className="text-[11px] text-slate-400 mt-0.5">ทะเบียน: {a.vehicle.license_plate}</p>
                                        )}
                                    </div>
                                </div>
                                <span className={clsx('text-[11px] font-bold px-2 py-0.5 rounded-md self-start shrink-0', a.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800')}>
                                    {a.status === 'OVERDUE' ? '⚠️ เกินกำหนด' : '⏳ ใกล้ถึงรอบ'}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-emerald-50/70 text-emerald-800 p-4 rounded-xl border border-emerald-200/80 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-sm">ยานพาหนะอยู่ในสภาพพร้อมใช้งาน</p>
                            <p className="text-xs text-emerald-700 mt-0.5">ไม่มีรายการแจ้งเตือนบำรุงรักษาค้างอยู่</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                    to="/driver/mileage"
                    className="bg-white hover:bg-purple-50/50 border border-slate-200/80 hover:border-purple-300 rounded-2xl p-5 shadow-xs transition-all flex items-center justify-between group"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-purple-100 text-[#8A1ABA] rounded-xl group-hover:scale-105 transition-transform">
                            <Gauge size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-base">บันทึกระยะทาง</h3>
                            <p className="text-xs text-slate-500 mt-0.5">อัปเดตเลขไมล์ประจำเดือน</p>
                        </div>
                    </div>
                    <ArrowRight size={18} className="text-slate-400 group-hover:text-[#8A1ABA] group-hover:translate-x-1 transition-all" />
                </Link>

                <Link
                    to="/driver/repair"
                    className="bg-white hover:bg-red-50/50 border border-slate-200/80 hover:border-red-300 rounded-2xl p-5 shadow-xs transition-all flex items-center justify-between group"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-red-100 text-red-600 rounded-xl group-hover:scale-105 transition-transform">
                            <Wrench size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-base">แจ้งซ่อม / เบิกฉุกเฉิน</h3>
                            <p className="text-xs text-slate-500 mt-0.5">ส่งคำขอเข้าซ่อมหรือเบิกสำรองจ่าย</p>
                        </div>
                    </div>
                    <ArrowRight size={18} className="text-slate-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
                </Link>
            </div>

            {/* Recent Repairs List */}
            {repairs.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                        <h2 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
                            <Wrench size={18} className="text-slate-600" />
                            <span>ประวัติการแจ้งซ่อมล่าสุด</span>
                        </h2>
                        <Link to="/driver/history" className="text-xs font-bold text-[#8A1ABA] hover:underline flex items-center gap-1">
                            ดูทั้งหมด <ArrowRight size={13} />
                        </Link>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {repairs.map(r => (
                            <div key={r.request_id} className="p-4 md:p-5 flex items-start justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-blue-600 text-xs bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                            REQ-{String(r.request_id).padStart(4, '0')}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-600">
                                            {r.vehicle?.license_plate}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-800">{r.issue_description}</p>
                                    <p className="text-xs text-slate-400 flex items-center gap-1">
                                        <Clock size={12} /> {new Date(r.created_at).toLocaleDateString('th-TH')}
                                    </p>
                                </div>
                                <span className={clsx('px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap shrink-0 border',
                                    r.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    r.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-blue-50 text-blue-700 border-blue-200')}>
                                    {r.status === 'COMPLETED' ? '✅ เสร็จสิ้น' : r.status === 'PENDING' ? '📝 รอตรวจสอบ' : '🔧 กำลังดำเนินการ'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
