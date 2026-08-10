import { useEffect, useState } from 'react';
import { Car, Wrench, Bell, Banknote, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../lib/axios';
import { toast } from 'react-toastify';
import clsx from 'clsx';

const StatusBadge = ({ status }) => {
    const map = {
        PENDING: 'bg-amber-100 text-amber-700',
        IN_PROGRESS: 'bg-blue-100 text-blue-700',
        COMPLETED: 'bg-green-100 text-green-700',
        AWAITING_APPROVAL: 'bg-purple-100 text-purple-700',
        APPROVED: 'bg-green-100 text-green-700',
        REJECTED: 'bg-red-100 text-red-700',
    };
    const label = {
        PENDING: 'รอตรวจสอบ', IN_PROGRESS: 'กำลังซ่อม', COMPLETED: 'เสร็จสิ้น',
        AWAITING_APPROVAL: 'รออนุมัติ', APPROVED: 'อนุมัติแล้ว', REJECTED: 'ไม่อนุมัติ',
    };
    return <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', map[status] || 'bg-slate-100 text-slate-600')}>{label[status] || status}</span>;
};

const AlertBadge = ({ status }) => {
    if (status === 'OVERDUE') return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-semibold">เลยกำหนด</span>;
    if (status === 'UPCOMING') return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold">ใกล้ถึงกำหนด</span>;
    return <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs">ดำเนินการแล้ว</span>;
};

export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/reports/dashboard')
            .then(res => setData(res.data))
            .catch(() => toast.error('ไม่สามารถโหลดข้อมูล Dashboard'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex items-center justify-center h-full"><div className="text-slate-500">กำลังโหลด...</div></div>;

    const stats = data?.stats || {};

    return (
        <div>
            <div className="mb-4 md:mb-6">
                <h1 className="text-xl md:text-2xl font-semibold text-slate-800">ภาพรวมระบบ (Dashboard)</h1>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
                <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border-l-4 border-blue-500">
                    <p className="text-xs md:text-sm text-slate-500 font-medium mb-1">รถยนต์ในระบบ</p>
                    <p className="text-2xl md:text-3xl font-bold text-slate-800">{stats.totalVehicles || 0} <span className="text-xs md:text-sm font-normal text-slate-500">คัน</span></p>
                    <p className="text-xs md:text-sm font-medium text-green-500 mt-1 md:mt-2">พร้อมใช้งาน {stats.readyVehicles || 0} คัน</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border-l-4 border-yellow-500">
                    <p className="text-xs md:text-sm text-slate-500 font-medium mb-1">คำร้องรออนุมัติ</p>
                    <p className="text-2xl md:text-3xl font-bold text-slate-800">{stats.pendingRepairs || 0} <span className="text-xs md:text-sm font-normal text-slate-500">รายการ</span></p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border-l-4 border-red-500">
                    <p className="text-xs md:text-sm text-slate-500 font-medium mb-1">แจ้งเตือนด่วน</p>
                    <p className="text-2xl md:text-3xl font-bold text-red-600">{stats.overdueAlerts || 0} <span className="text-xs md:text-sm font-normal text-slate-500">รายการ</span></p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border-l-4 border-green-500">
                    <p className="text-xs md:text-sm text-slate-500 font-medium mb-1">ค่าซ่อมเดือนนี้</p>
                    <p className="text-xl md:text-3xl font-bold text-slate-800">{(stats.monthlyExpense || 0).toLocaleString()} <span className="text-xs md:text-sm font-normal text-slate-500">บาท</span></p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h2 className="text-base md:text-lg font-semibold text-slate-800">⚠️ แจ้งเตือนบำรุงรักษา</h2>
                    </div>
                    <div className="md:hidden divide-y divide-slate-100">
                        {data?.maintenanceAlerts?.length === 0 && (
                            <p className="text-center py-6 text-slate-400 text-sm">ไม่มีการแจ้งเตือน</p>
                        )}
                        {data?.maintenanceAlerts?.map(alert => (
                            <div key={alert.alert_id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <p className="font-medium text-slate-800">{alert.vehicle?.license_plate}</p>
                                    <AlertBadge status={alert.is_resolved ? 'DONE' : 'UPCOMING'} />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{alert.alert_type}</p>
                            </div>
                        ))}
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600"><tr>
                                <th className="px-6 py-3">ทะเบียนรถ</th>
                                <th className="px-6 py-3">ประเภท</th>
                                <th className="px-6 py-3">สถานะ</th>
                            </tr></thead>
                            <tbody>
                                {data?.maintenanceAlerts?.length === 0 && (
                                    <tr><td colSpan={3} className="text-center py-6 text-slate-400">ไม่มีการแจ้งเตือน</td></tr>
                                )}
                                {data?.maintenanceAlerts?.map(alert => (
                                    <tr key={alert.alert_id} className="border-b hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium">{alert.vehicle?.license_plate}</td>
                                        <td className="px-6 py-4">{alert.alert_type}</td>
                                        <td className="px-6 py-4"><AlertBadge status={alert.is_resolved ? 'DONE' : 'UPCOMING'} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h2 className="text-base md:text-lg font-semibold text-slate-800">🛠️ คำร้องซ่อมล่าสุด</h2>
                    </div>
                    <div className="md:hidden divide-y divide-slate-100">
                        {data?.recentRepairs?.length === 0 && (
                            <p className="text-center py-6 text-slate-400 text-sm">ไม่มีคำร้อง</p>
                        )}
                        {data?.recentRepairs?.map(r => (
                            <div key={r.request_id} className="p-4">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="font-medium text-slate-800">{r.vehicle?.license_plate}</p>
                                    <StatusBadge status={r.status} />
                                </div>
                                <p className="text-xs text-slate-500 truncate">{r.description}</p>
                                <p className="text-xs text-slate-400 mt-1">{new Date(r.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}</p>
                            </div>
                        ))}
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600"><tr>
                                <th className="px-6 py-3">วันที่</th>
                                <th className="px-6 py-3">ทะเบียน / ปัญหา</th>
                                <th className="px-6 py-3">สถานะ</th>
                            </tr></thead>
                            <tbody>
                                {data?.recentRepairs?.length === 0 && (
                                    <tr><td colSpan={3} className="text-center py-6 text-slate-400">ไม่มีคำร้อง</td></tr>
                                )}
                                {data?.recentRepairs?.map(r => (
                                    <tr key={r.request_id} className="border-b hover:bg-slate-50">
                                        <td className="px-6 py-4 text-slate-500">{new Date(r.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{r.vehicle?.license_plate}</div>
                                            <div className="text-xs text-slate-500">{r.description}</div>
                                        </td>
                                        <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
