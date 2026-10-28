import { useEffect, useState } from 'react';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Disc,
    Droplet,
    Wrench,
} from 'lucide-react';
import api from '../lib/axios';
import clsx from 'clsx';
import Skeleton from './Skeleton';

const WARNING_DISTANCE = 2000;

const MaintenanceForecastCard = () => {
    const [forecast, setForecast] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const fetchForecast = async () => {
            setLoading(true);
            try {
                const res = await api.get('/alerts/forecast');
                const sorted = [...res.data].sort((a, b) => {
                    const minA = Math.min(...a.forecasts.map((item) => item.remaining_mileage));
                    const minB = Math.min(...b.forecasts.map((item) => item.remaining_mileage));
                    return minA - minB;
                });

                if (!cancelled) {
                    setForecast(sorted);
                    setError(null);
                }
            } catch {
                if (!cancelled) setError('ไม่สามารถโหลดข้อมูลการคาดการณ์ได้');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchForecast();
        return () => {
            cancelled = true;
        };
    }, []);

    const getStatusInfo = (remaining) => {
        if (remaining <= 0) {
            return {
                color: 'text-rose-700',
                bg: 'bg-rose-50',
                border: 'border-rose-200',
                bar: 'bg-rose-500',
                icon: <AlertCircle size={14} />,
                text: 'เลยกำหนด',
            };
        }
        if (remaining <= WARNING_DISTANCE) {
            return {
                color: 'text-amber-700',
                bg: 'bg-amber-50',
                border: 'border-amber-200',
                bar: 'bg-amber-500',
                icon: <AlertTriangle size={14} />,
                text: 'ใกล้ถึงระยะ',
            };
        }
        return {
            color: 'text-emerald-700',
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            bar: 'bg-emerald-500',
            icon: <CheckCircle2 size={14} />,
            text: 'ตามปกติ',
        };
    };

    if (loading) return <Skeleton className="h-64 w-full rounded-2xl mb-6" />;

    if (error) {
        return (
            <div className="bg-rose-50 p-4 rounded-xl text-rose-700 text-sm text-center border border-rose-100 mb-6">
                {error}
            </div>
        );
    }

    if (forecast.length === 0) return null;

    const criticalVehicles = forecast.filter((item) =>
        item.forecasts.some((itemForecast) => itemForecast.remaining_mileage <= WARNING_DISTANCE),
    );
    const displayedVehicles = showAll ? forecast : criticalVehicles.slice(0, 3);
    const hasMore = forecast.length > displayedVehicles.length;

    return (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
            <header className="px-5 py-4 md:px-6 md:py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                        <Wrench size={19} />
                    </div>
                    <div>
                        <h2 className="text-base md:text-lg font-bold text-slate-900">
                            สรุปการบำรุงรักษารถประจำเดือน
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            ระยะทางปัจจุบันเทียบกับรอบบำรุงรักษาถัดไป
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        ใกล้ถึง {forecast.reduce((count, item) => count + item.forecasts.filter((itemForecast) => itemForecast.remaining_mileage > 0 && itemForecast.remaining_mileage <= WARNING_DISTANCE).length, 0)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        เลยกำหนด {forecast.reduce((count, item) => count + item.forecasts.filter((itemForecast) => itemForecast.remaining_mileage <= 0).length, 0)}
                    </span>
                </div>
            </header>

            <div className="p-4 md:p-5 space-y-3">
                {!showAll && displayedVehicles.length === 0 && (
                    <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-5">
                        <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-emerald-800">รถทุกคันยังไม่ใกล้ถึงรอบบำรุงรักษา</p>
                            <p className="text-xs text-emerald-700 mt-0.5">จะแสดงรายการเมื่อเหลือระยะไม่เกิน {WARNING_DISTANCE.toLocaleString()} กม.</p>
                        </div>
                    </div>
                )}

                {displayedVehicles.map((item) => (
                    <article
                        key={item.vehicle.vehicle_id}
                        className="rounded-xl border border-slate-200 p-4 md:p-5"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                            <div>
                                <h3 className="font-bold text-slate-900">
                                    {item.vehicle.license_plate}
                                </h3>
                                {(item.vehicle.brand || item.vehicle.model) && (
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {[item.vehicle.brand, item.vehicle.model].filter(Boolean).join(' ')}
                                    </p>
                                )}
                            </div>
                            <div className="text-xs text-slate-500">
                                เลขไมล์ปัจจุบัน{' '}
                                <span className="font-semibold text-slate-800">
                                    {(item.current_mileage || 0).toLocaleString()} กม.
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {item.forecasts.map((itemForecast) => {
                                const status = getStatusInfo(itemForecast.remaining_mileage);
                                const isOil = itemForecast.type === 'OIL_CHANGE';
                                const interval = Math.max(Number(itemForecast.interval) || 1, 1);
                                const remaining = Number(itemForecast.remaining_mileage) || 0;
                                const progress = Math.min(
                                    100,
                                    Math.max(0, ((interval - remaining) / interval) * 100),
                                );
                                const warningPosition = Math.min(
                                    100,
                                    Math.max(0, ((interval - WARNING_DISTANCE) / interval) * 100),
                                );

                                return (
                                    <div
                                        key={itemForecast.type}
                                        className={clsx('rounded-xl border p-3.5', status.bg, status.border)}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-600 shrink-0">
                                                    {isOil ? <Droplet size={16} /> : <Disc size={16} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800">
                                                        {isOil ? 'น้ำมันเครื่อง' : 'ยางรถยนต์'}
                                                    </p>
                                                    {isOil && item.oil_grade_last_used && (
                                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                                            {item.oil_grade_last_used === 'MINERAL' && 'น้ำมันธรรมดา'}
                                                            {item.oil_grade_last_used === 'SEMI_SYNTHETIC' && 'กึ่งสังเคราะห์'}
                                                            {item.oil_grade_last_used === 'FULLY_SYNTHETIC' && 'สังเคราะห์แท้'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={clsx('inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap', status.color)}>
                                                {status.icon}
                                                {status.text}
                                            </span>
                                        </div>

                                        <div className="mt-4">
                                            <div className="flex items-baseline justify-between gap-2 mb-2">
                                                <span className="text-xs text-slate-500">ระยะถึงรอบถัดไป</span>
                                                <span className={clsx('text-sm font-bold', status.color)}>
                                                    {remaining > 0
                                                        ? `เหลือ ${remaining.toLocaleString()} กม.`
                                                        : `เกิน ${Math.abs(remaining).toLocaleString()} กม.`}
                                                </span>
                                            </div>
                                            <div
                                                className="relative h-2 rounded-full bg-white/80 overflow-visible"
                                                role="progressbar"
                                                aria-label={`ความคืบหน้ารอบ${isOil ? 'น้ำมันเครื่อง' : 'เปลี่ยนยาง'} ${item.vehicle.license_plate}`}
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                                aria-valuenow={Math.round(progress)}
                                            >
                                                <div
                                                    className={clsx('h-full rounded-full transition-all', status.bar)}
                                                    style={{ width: `${progress}%` }}
                                                />
                                                <span
                                                    className="absolute -top-0.5 h-3 w-0.5 bg-slate-500/70 rounded-full"
                                                    style={{ left: `${warningPosition}%` }}
                                                    title={`เริ่มเตือนเมื่อเหลือ ${WARNING_DISTANCE.toLocaleString()} กม.`}
                                                />
                                            </div>
                                            <div className="flex justify-between gap-2 mt-2 text-[10px] text-slate-500">
                                                <span>เริ่มรอบ</span>
                                                <span className="text-center">ขีด = เริ่มเตือนที่เหลือ {WARNING_DISTANCE.toLocaleString()} กม.</span>
                                                <span className="text-right">รอบ {Number(itemForecast.next_service_mileage || 0).toLocaleString()} กม.</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </article>
                ))}

                {(hasMore || showAll) && (
                    <div className="pt-2 flex justify-center">
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                            {showAll ? (
                                <>
                                    ซ่อนรถที่ยังปกติ <ChevronUp size={16} />
                                </>
                            ) : (
                                <>
                                    ดูรถทั้งหมด ({forecast.length} คัน) <ChevronDown size={16} />
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default MaintenanceForecastCard;
