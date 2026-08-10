import { useEffect, useState } from 'react';
import { TrendingUp, Car, Gauge, ClipboardList } from 'lucide-react';
import api from '../../lib/axios';
import { toast } from 'react-toastify';
import clsx from 'clsx';

export default function ExecutiveDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/reports/executive')
            .then(res => setData(res.data))
            .catch(() => toast.error('โหลดข้อมูลไม่สำเร็จ'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">กำลังโหลด...</div>;
    const stats = data?.stats || {};

    return (
        <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-800 mb-4 md:mb-6">ภาพรวมผู้บริหาร</h1>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
                {[
                    { label: 'ค่าใช้จ่ายรวมปีนี้', value: `${(stats.yearlyExpense || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, color: 'text-red-600', icon: TrendingUp, border: 'border-red-500' },
                    { label: 'อัตราพร้อมใช้งาน', value: `${stats.availabilityRate || 0}%`, color: 'text-green-600', icon: Car, border: 'border-green-500' },
                    { label: 'ระยะทางรวม', value: `${(stats.totalMileage || 0).toLocaleString()} กม.`, color: 'text-blue-600', icon: Gauge, border: 'border-blue-500' },
                    { label: 'รอการอนุมัติ', value: `${stats.pendingApprovals || 0} รายการ`, color: 'text-amber-600', icon: ClipboardList, border: 'border-amber-500' },
                ].map(({ label, value, color, icon: Icon, border }) => (
                    <div key={label} className={`bg-white rounded-xl shadow-sm p-4 md:p-6 border-l-4 ${border}`}>
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <p className="text-xs md:text-sm text-slate-500 font-medium mb-1">{label}</p>
                                <p className={`text-lg md:text-2xl font-bold ${color} break-words`}>{value}</p>
                            </div>
                            <div className="p-2 md:p-3 rounded-lg bg-slate-50 ml-2 shrink-0"><Icon size={20} className={color} /></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Top 5 Vehicles - mobile: cards, desktop: table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="text-base md:text-lg font-semibold text-slate-800">🏆 Top 5 ยานพาหนะค่าซ่อมสูงสุดปีนี้</h2>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-100">
                    {!data?.topVehicles?.length && (
                        <p className="text-center py-8 text-slate-400 text-sm">ยังไม่มีข้อมูลค่าซ่อม</p>
                    )}
                    {data?.topVehicles?.map((tv, i) => (
                        <div key={tv.vehicle?.vehicle_id || tv.vehicle?.id} className="p-4 flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-700' : 'bg-orange-50 text-orange-600'}`}>{i + 1}</span>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-800">{tv.vehicle?.license_plate}</p>
                                <p className="text-xs text-slate-500">{tv.vehicle?.brand} {tv.vehicle?.model}</p>
                                <p className="text-xs text-slate-400">{tv.vehicle?.driver?.full_name || '-'}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="font-bold text-slate-800 text-sm">{(tv.totalCost || 0).toLocaleString('th-TH', { minimumFractionDigits: 0 })} บ.</p>
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">{tv.repairCount} ครั้ง</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-white text-slate-600 border-b"><tr>
                            <th className="px-6 py-4 font-semibold text-center">อันดับ</th>
                            <th className="px-6 py-4 font-semibold">ทะเบียนรถ</th>
                            <th className="px-6 py-4 font-semibold">ผู้รับผิดชอบ</th>
                            <th className="px-6 py-4 font-semibold text-center">จำนวนครั้งซ่อม</th>
                            <th className="px-6 py-4 font-semibold text-right">ค่าซ่อมรวม (บาท)</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {!data?.topVehicles?.length && <tr><td colSpan={5} className="text-center py-8 text-slate-400">ยังไม่มีข้อมูลค่าซ่อม</td></tr>}
                            {data?.topVehicles?.map((tv, i) => (
                                <tr key={tv.vehicle?.vehicle_id || tv.vehicle?.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-center">
                                        <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center mx-auto ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-700' : 'bg-orange-50 text-orange-600'}`}>{i + 1}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-800">{tv.vehicle?.license_plate}</div>
                                        <div className="text-xs text-slate-500">{tv.vehicle?.brand} {tv.vehicle?.model}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{tv.vehicle?.driver?.full_name || tv.vehicle?.driver?.fullName || '-'}</td>
                                    <td className="px-6 py-4 text-center"><span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium">{tv.repairCount} ครั้ง</span></td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-800">{(tv.totalCost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
