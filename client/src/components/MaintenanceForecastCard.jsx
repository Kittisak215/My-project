import { useEffect, useMemo, useState } from "react";
import {
  Search,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Droplet,
  Disc,
  X,
} from "lucide-react";
import api from "../lib/axios";
import clsx from "clsx";
import Skeleton from "./Skeleton";

const OIL_GRADE_LABEL = {
  MINERAL: "ธรรมดา",
  SEMI_SYNTHETIC: "กึ่งสังเคราะห์",
  FULLY_SYNTHETIC: "สังเคราะห์แท้",
};

const getStatusMeta = (remaining) => {
  if (remaining <= 0) {
    return {
      key: "OVERDUE",
      text: "เลยกำหนด",
      textColor: "text-red-700",
      barColor: "bg-red-500",
      badgeClass: "bg-red-50 text-red-700 border-red-200/80",
      icon: AlertCircle,
    };
  }
  if (remaining <= 2000) {
    return {
      key: "UPCOMING",
      text: "ใกล้ถึงกำหนด",
      textColor: "text-amber-700",
      barColor: "bg-amber-500",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80",
      icon: AlertTriangle,
    };
  }
  return {
    key: "NORMAL",
    text: "ปกติ",
    textColor: "text-emerald-700",
    barColor: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    icon: CheckCircle2,
  };
};

/** Estimate visual progress bar fill (0-100%) based on remaining km */
const getProgressPercent = (forecast) => {
  const { remaining_mileage: remaining, type } = forecast;
  if (remaining <= 0) return 100;
  const typicalInterval = type === "OIL_CHANGE" ? 10000 : 50000;
  const used = Math.max(0, typicalInterval - remaining);
  return Math.min(100, Math.max(8, Math.round((used / typicalInterval) * 100)));
};

const ForecastCell = ({ forecast, oilGrade }) => {
  if (!forecast) {
    return <span className="text-xs text-slate-400">ไม่มีข้อมูล</span>;
  }

  const status = getStatusMeta(forecast.remaining_mileage);
  const progress = getProgressPercent(forecast);
  const isOil = forecast.type === "OIL_CHANGE";

  return (
    <div className="space-y-1.5 min-w-[170px]">
      <div className="flex items-center justify-between gap-2">
        <span className={clsx("text-xs font-semibold tabular-nums", status.textColor)}>
          {forecast.remaining_mileage > 0
            ? `เหลือ ${forecast.remaining_mileage.toLocaleString("th-TH")} กม.`
            : `เกิน ${Math.abs(forecast.remaining_mileage).toLocaleString("th-TH")} กม.`}
        </span>
        {isOil && oilGrade && OIL_GRADE_LABEL[oilGrade] && (
          <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
            {OIL_GRADE_LABEL[oilGrade]}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={isOil ? "ระยะน้ำมันเครื่อง" : "ระยะยางรถยนต์"}
      >
        <div
          className={clsx("h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none", status.barColor)}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
        <span>รอบถัดไป {forecast.next_service_mileage.toLocaleString("th-TH")} กม.</span>
        <span className={clsx("font-medium", status.textColor)}>{status.text}</span>
      </div>
    </div>
  );
};

const MaintenanceForecastCard = () => {
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("URGENT");
  const [search, setSearch] = useState("");
  const [showAllRows, setShowAllRows] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchForecast = async () => {
      setLoading(true);
      try {
        const res = await api.get("/alerts/forecast");
        if (cancelled) return;

        const sorted = [...(res.data || [])].sort((a, b) => {
          const minA = Math.min(...a.forecasts.map((f) => f.remaining_mileage));
          const minB = Math.min(...b.forecasts.map((f) => f.remaining_mileage));
          return minA - minB;
        });

        setForecast(sorted);
        const hasUrgent = sorted.some((item) =>
          item.forecasts.some((f) => f.remaining_mileage <= 2000),
        );
        setActiveTab(hasUrgent ? "URGENT" : "ALL");
        setError(null);
      } catch {
        if (!cancelled) setError("ไม่สามารถโหลดข้อมูลการคาดการณ์รอบบำรุงรักษาได้");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchForecast();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    let overdue = 0;
    let upcoming = 0;
    let normal = 0;
    forecast.forEach((item) => {
      const min = Math.min(...item.forecasts.map((f) => f.remaining_mileage));
      if (min <= 0) overdue += 1;
      else if (min <= 2000) upcoming += 1;
      else normal += 1;
    });
    return {
      all: forecast.length,
      urgent: overdue + upcoming,
      overdue,
      upcoming,
      normal,
    };
  }, [forecast]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return forecast.filter((item) => {
      if (q && !(item.vehicle?.license_plate || "").toLowerCase().includes(q)) {
        return false;
      }
      const min = Math.min(...item.forecasts.map((f) => f.remaining_mileage));
      if (activeTab === "URGENT") return min <= 2000;
      if (activeTab === "OVERDUE") return min <= 0;
      if (activeTab === "UPCOMING") return min > 0 && min <= 2000;
      if (activeTab === "NORMAL") return min > 2000;
      return true;
    });
  }, [forecast, activeTab, search]);

  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-xl text-red-700 text-sm text-center border border-red-200/80">
        {error}
      </div>
    );
  }

  if (forecast.length === 0) return null;

  const isMultiVehicle = forecast.length > 1;
  const ROW_LIMIT = 8;
  const displayedRows =
    showAllRows || search.trim() ? filteredList : filteredList.slice(0, ROW_LIMIT);
  const hiddenCount = filteredList.length - displayedRows.length;

  const tabs = [
    { id: "URGENT", label: "ต้องดูแลด่วน", count: counts.urgent },
    { id: "OVERDUE", label: "เลยกำหนด", count: counts.overdue },
    { id: "UPCOMING", label: "ใกล้กำหนด", count: counts.upcoming },
    { id: "ALL", label: "ทั้งหมด", count: counts.all },
  ];

  return (
    <section className="bg-white rounded-2xl border border-purple-200/60 shadow-xs overflow-hidden">
      {/* ── Header + Controls ── */}
      <div className="px-5 py-4 border-b border-purple-100/80 bg-purple-50/40 space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              สรุปการบำรุงรักษารถประจำเดือน
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ระยะทางคงเหลือก่อนถึงรอบเปลี่ยนถ่ายน้ำมันเครื่องและยางรถยนต์ (เรียงตามความเร่งด่วน)
            </p>
          </div>

          {isMultiVehicle && (
            <div className="relative w-full md:w-60">
              <label htmlFor="forecast-search" className="sr-only">
                ค้นหาทะเบียนรถ
              </label>
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="forecast-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาทะเบียนรถ…"
                autoComplete="off"
                spellCheck={false}
                className="w-full pl-9 pr-8 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] focus-visible:border-transparent transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="ล้างคำค้นหา"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        {isMultiVehicle && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" role="tablist" aria-label="กรองตามสถานะบำรุงรักษา">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setShowAllRows(false);
                  }}
                  className={clsx(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] cursor-pointer",
                    isActive
                      ? "bg-[#8A1ABA] text-white"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={clsx(
                      "px-1.5 py-0.2 rounded-md text-[11px] tabular-nums",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-white text-slate-600",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Empty State ── */}
      {displayedRows.length === 0 ? (
        <div className="py-12 px-4 text-center">
          <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-700">
            {search.trim()
              ? `ไม่พบรถทะเบียน “${search.trim()}”`
              : "ไม่มีรถในหมวดหมู่นี้"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {search.trim()
              ? "ลองตรวจสอบคำค้นหา หรือเลือกดูแท็บทั้งหมด"
              : "รถทุกคันอยู่ในระยะใช้งานปกติ"}
          </p>
          {activeTab !== "ALL" && !search.trim() && (
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className="mt-3 text-xs font-medium text-[#8A1ABA] hover:underline cursor-pointer"
            >
              ดูรถทั้งหมด ({counts.all} คัน)
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── Desktop Compact Table ── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-5">ทะเบียนรถ / เลขไมล์ปัจจุบัน</th>
                  <th className="py-3 px-5">
                    <span className="inline-flex items-center gap-1.5">
                      <Droplet size={13} className="text-slate-400" aria-hidden="true" />
                      น้ำมันเครื่อง
                    </span>
                  </th>
                  <th className="py-3 px-5">
                    <span className="inline-flex items-center gap-1.5">
                      <Disc size={13} className="text-slate-400" aria-hidden="true" />
                      ยางรถยนต์
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedRows.map((item) => {
                  const oilForecast = item.forecasts.find((f) => f.type === "OIL_CHANGE");
                  const tireForecast = item.forecasts.find((f) => f.type === "TIRE_CHANGE");
                  return (
                    <tr
                      key={item.vehicle.vehicle_id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-5 align-middle whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-900">
                          {item.vehicle.license_plate}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                          {item.current_mileage.toLocaleString("th-TH")} กม.
                        </div>
                      </td>
                      <td className="py-3.5 px-5 align-middle">
                        <ForecastCell
                          forecast={oilForecast}
                          oilGrade={item.oil_grade_last_used}
                        />
                      </td>
                      <td className="py-3.5 px-5 align-middle">
                        <ForecastCell forecast={tireForecast} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Stacked List ── */}
          <div className="md:hidden divide-y divide-slate-100">
            {displayedRows.map((item) => {
              const oilForecast = item.forecasts.find((f) => f.type === "OIL_CHANGE");
              const tireForecast = item.forecasts.find((f) => f.type === "TIRE_CHANGE");
              return (
                <div key={item.vehicle.vehicle_id} className="p-4 space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {item.vehicle.license_plate}
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums">
                      ไมล์ {item.current_mileage.toLocaleString("th-TH")} กม.
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 pt-1">
                    <div>
                      <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mb-1">
                        <Droplet size={12} aria-hidden="true" />
                        น้ำมันเครื่อง
                      </div>
                      <ForecastCell
                        forecast={oilForecast}
                        oilGrade={item.oil_grade_last_used}
                      />
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mb-1">
                        <Disc size={12} aria-hidden="true" />
                        ยางรถยนต์
                      </div>
                      <ForecastCell forecast={tireForecast} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Show More / Less Footer ── */}
          {(hiddenCount > 0 || (showAllRows && filteredList.length > ROW_LIMIT)) && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between">
              <span className="text-xs text-slate-500 tabular-nums">
                แสดง {displayedRows.length} จาก {filteredList.length} คัน
              </span>
              <button
                type="button"
                onClick={() => setShowAllRows((prev) => !prev)}
                className="text-xs font-semibold text-[#8A1ABA] hover:text-[#6b1291] px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] cursor-pointer"
              >
                {showAllRows ? "ย่อรายการ" : `แสดงเพิ่มอีก ${hiddenCount} คัน`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default MaintenanceForecastCard;
