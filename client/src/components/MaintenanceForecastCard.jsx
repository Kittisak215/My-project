import { useEffect, useState } from 'react';
import { Wrench, Info, AlertTriangle, AlertCircle, Droplet, Disc } from 'lucide-react';
import api from '../lib/axios';
import clsx from 'clsx';
import Skeleton from './Skeleton';

const MaintenanceForecastCard = () => {
    const [forecast, setForecast] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAll, setShowAll] = useState(false);

    const fetchForecast = async () => {
        setLoading(true);
        try {
            const res = await api.get('/alerts/forecast');
            
            // Sort vehicles by the lowest remaining mileage (most critical first)
            const sorted = res.data.sort((a, b) => {
                const minA = Math.min(...a.forecasts.map(f => f.remaining_mileage));
                const minB = Math.min(...b.forecasts.map(f => f.remaining_mileage));
                return minA - minB;
            });
            
            setForecast(sorted);
            setError(null);
        } catch {
            setError('ไม่สามารถโหลดข้อมูลการคาดการณ์ได้');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchForecast();
    }, []);

    const getStatusInfo = (remaining) => {
        if (remaining <= 0) return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: <AlertCircle size={16} />, text: 'เลยกำหนด' };
        if (remaining <= 2000) return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: <AlertTriangle size={16} />, text: 'ใกล้ถึงกำหนด' };
        return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <Info size={16} />, text: 'ปกติ' };
    };

    if (loading) return <Skeleton className="h-64 w-full rounded-2xl mb-6" />;

    if (error) return (
        <div className="bg-red-50 p-4 rounded-xl text-red-600 text-sm text-center border border-red-100 mb-6">
            {error}
        </div>
    );

    if (forecast.length === 0) return null;

    // Filter critical vehicles (<= 2000 km)
    const criticalVehicles = forecast.filter(item => 
        item.forecasts.some(f => f.remaining_mileage <= 2000)
    );
    
    // Logic for what to display
    const displayedVehicles = showAll 
        ? forecast 
        : criticalVehicles.slice(0, 3);
        
    const hasMore = forecast.length > displayedVehicles.length;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-blue-50 to-white">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                        <Wrench size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">สรุปการบำรุงรักษารถประจำเดือน</h2>
                        <p className="text-xs text-slate-500 mt-0.5">ระยะทางคงเหลือก่อนรอบซ่อมบำรุงถัดไป</p>
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-5 space-y-4">
                {!showAll && displayedVehicles.length === 0 && (
                    <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200 flex flex-col items-center justify-center gap-2 py-8 text-center">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2">
                            <Info size={24} />
                        </div>
                        <p className="font-bold">รถทุกคันอยู่ในสภาพปกติ</p>
                        <p className="text-xs text-emerald-600">ไม่มีรถคันไหนที่ใกล้ถึงระยะซ่อมบำรุงในขณะนี้</p>
                    </div>
                )}
                
                {displayedVehicles.map((item) => (
                    <div key={item.vehicle.vehicle_id} className="bg-slate-50 rounded-xl p-4 border border-slate-100 transition-all">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200 border-dashed">
                            <div className="flex items-center gap-3">
                                <div className="font-bold text-slate-800 text-base">{item.vehicle.license_plate}</div>
                                <div className="text-xs text-slate-500 px-2 py-1 bg-white rounded-md border border-slate-200 shadow-xs">เลขไมล์ล่าสุด: {item.current_mileage.toLocaleString()} กม.</div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {item.forecasts.map((f, idx) => {
                                const status = getStatusInfo(f.remaining_mileage);
                                const isOil = f.type === 'OIL_CHANGE';
                                return (
                                    <div key={idx} className={clsx("p-3 rounded-lg border flex items-center justify-between transition-colors", status.bg, status.border)}>
                                        <div className="flex items-center gap-2">
                                            <div className={clsx("p-1.5 rounded-md bg-white shadow-sm", status.color)}>
                                                {isOil ? <Droplet size={14} /> : <Disc size={14} />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-slate-700">{isOil ? 'น้ำมันเครื่อง' : 'ยางรถยนต์'}</span>
                                                <span className={clsx("text-[10px] font-medium flex items-center gap-1", status.color)}>
                                                    {status.icon} {status.text}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={clsx("font-bold text-sm", status.color)}>
                                                {f.remaining_mileage > 0 ? `${f.remaining_mileage.toLocaleString()} กม.` : 'เลยกำหนด'}
                                            </div>
                                            <div className="text-[10px] text-slate-400">รอบกำหนด: {f.next_service_mileage.toLocaleString()}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
                
                {/* Toggle Button */}
                {(hasMore || showAll) && forecast.length > 0 && (
                    <div className="pt-2 flex justify-center border-t border-slate-100 mt-4">
                        <button 
                            onClick={() => setShowAll(!showAll)}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-full transition-colors flex items-center gap-2"
                        >
                            {showAll ? 'ซ่อนรถที่ปกติ' : `ดูรถทั้งหมด (${forecast.length} คัน)`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MaintenanceForecastCard;
