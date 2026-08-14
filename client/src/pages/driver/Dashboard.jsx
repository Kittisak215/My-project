import { useEffect, useState } from 'react';
import { Car, Wrench, AlertCircle } from 'lucide-react';
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
                setAlerts(aRes.data.filter(a => a.status !== 'DONE' && vehicleIds.includes(a.vehicle_id)).slice(0, 3));
            })
            .catch(() => toast.error('โหลดข้อมูลไม่สำเร็จ'))
            .finally(() => setLoading(false));
    }, []);

    const displayName = user?.full_name || user?.driver?.full_name || user?.username;
    const vehicle = vehicles[0];

    return (
        <div>
            <div className="bg-teal-700 text-white rounded-2xl p-6 mb-6 shadow-md">
                <p className="text-teal-200 text-sm">ยินดีต้อนรับ</p>
                <h1 className="text-2xl font-bold mt-1 mb-3">{displayName}</h1>
                {vehicle ? (
                    <div className="bg-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="bg-white/20 p-2 rounded-lg"><Car size={22} /></div>
                            <div>
                                <p className="font-bold text-lg">{vehicle.license_plate}</p>
                                <p className="text-teal-200 text-sm">{vehicle.brand} {vehicle.model}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-white/10 p-2 rounded-lg">
                                <p className="text-teal-200">เลขไมล์ปัจจุบัน</p>
                                <p className="font-bold">{(vehicle.current_mileage || 0).toLocaleString()} กม.</p>
                            </div>
                            <div className="bg-white/10 p-2 rounded-lg">
                                <p className="text-teal-200">ต่อภาษีถึง</p>
                                <p className="font-bold">{vehicle.tax_due_date ? new Date(vehicle.tax_due_date).toLocaleDateString('th-TH') : '-'}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/10 rounded-xl p-4 text-teal-200 text-sm">ยังไม่มียานพาหนะที่ได้รับมอบหมาย</div>
                )}
            </div>

            <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-3">⚠️ การแจ้งเตือนบำรุงรักษา</h2>
                {alerts.length > 0 ? (
                    <div className="space-y-3">
                        {alerts.map(a => (
                            <div key={a.alert_id} className={clsx('p-4 rounded-xl border-l-4 flex items-start gap-3', a.status === 'OVERDUE' ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-400')}>
                                <AlertCircle size={20} className={a.status === 'OVERDUE' ? 'text-red-500 shrink-0 mt-0.5' : 'text-amber-500 shrink-0 mt-0.5'} />
                                <div>
                                    <p className={clsx('font-semibold', a.status === 'OVERDUE' ? 'text-red-800' : 'text-amber-800')}>{a.alert_type}</p>
                                    <p className="text-sm text-slate-600">กำหนดที่ {(a.next_service_mileage || 0).toLocaleString()} กม.</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 flex items-center gap-3">
                        <span className="text-xl">✅</span>
                        <div>
                            <p className="font-semibold">ไม่มีแจ้งเตือนค้างอยู่</p>
                            <p className="text-sm text-green-600">รถอยู่ในสภาพพร้อมใช้งาน</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <Link to="/driver/mileage" className="bg-[#8A1ABA] hover:bg-[#72159c] text-white rounded-xl p-4 text-center shadow-sm transition-colors font-semibold flex items-center justify-center min-h-[56px]">
                    บันทึกระยะทาง
                </Link>
                <Link to="/driver/repair" className="bg-red-600 hover:bg-red-700 text-white rounded-xl p-4 text-center shadow-sm transition-colors font-semibold flex items-center justify-center min-h-[56px]">
                    แจ้งซ่อม / เบิกฉุกเฉิน
                </Link>
            </div>

            {repairs.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 mb-3">🛠️ ประวัติการซ่อมล่าสุด</h2>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        {repairs.map(r => (
                            <div key={r.request_id} className="p-4 border-b last:border-b-0 flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-blue-600">REQ-{String(r.request_id).padStart(4, '0')}</p>
                                    <p className="text-sm text-slate-700">{r.issue_description}</p>
                                    <p className="text-xs text-slate-500 mt-1">{new Date(r.created_at).toLocaleDateString('th-TH')}</p>
                                </div>
                                <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0',
                                    r.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}>
                                    {r.status === 'COMPLETED' ? '✅ เสร็จ' : r.status === 'PENDING' ? '📝 รอตรวจ' : '🔧 ดำเนินการ'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
