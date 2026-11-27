import { useEffect, useState } from "react";
import {
  Car,
  Wrench,
  AlertCircle,
  Gauge,
  Clock,
  ShieldCheck,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import MaintenanceForecastCard from "../../components/MaintenanceForecastCard";
import StatusBadge from "../../components/StatusBadge";
import Skeleton from "../../components/Skeleton";
import clsx from "clsx";

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
      api.get("/vehicles", { params: { limit: 100, is_active: "true" } }),
      api.get("/repairs", { params: { limit: 5 } }),
      api.get("/alerts"),
    ])
      .then(([vRes, rRes, aRes]) => {
        const driverVehicles = (vRes.data.data || []).filter(
          (v) => (v.driver_id || v.driverId) === driverId,
        );
        const vehicleIds = driverVehicles.map((v) => v.vehicle_id);
        setVehicles(driverVehicles);
        setRepairs((rRes.data.data || []).filter((r) => vehicleIds.includes(r.vehicle_id)));
        setAlerts(
          (aRes.data || [])
            .filter((a) => a.status !== "DONE" && vehicleIds.includes(a.vehicle_id))
            .slice(0, 5),
        );
      })
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [user?.driver_id, user?.driver?.driver_id]);

  const displayName = user?.full_name || user?.driver?.full_name || user?.username;
  const vehicle = vehicles[selectedIdx];

  const hasLoggedThisMonth = (() => {
    if (!vehicle?.mileageLogs || vehicle.mileageLogs.length === 0) return false;
    const lastLogDate = new Date(vehicle.mileageLogs[0].record_date);
    const now = new Date();
    return (
      lastLogDate.getMonth() === now.getMonth() &&
      lastLogDate.getFullYear() === now.getFullYear()
    );
  })();

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5 pb-10">
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10">
      {/* Header & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">ยินดีต้อนรับ</p>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            {displayName}
          </h1>
        </div>

        {vehicles.length > 1 && (
          <div className="sm:w-64">
            <label htmlFor="driver-vehicle-select" className="sr-only">
              เลือกรถที่รับผิดชอบ
            </label>
            <select
              id="driver-vehicle-select"
              value={selectedIdx}
              onChange={(e) => setSelectedIdx(parseInt(e.target.value))}
              className="w-full bg-white border border-slate-200/90 text-slate-800 font-medium text-sm rounded-xl px-3.5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] cursor-pointer"
            >
              {vehicles.map((v, i) => (
                <option key={v.vehicle_id || v.id} value={i}>
                  {v.license_plate} ({v.brand} {v.model})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Vehicle Card */}
      {vehicles.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/90">
          <Car size={36} className="mx-auto text-slate-300 mb-2" aria-hidden="true" />
          <p className="text-slate-800 text-sm font-semibold">ยังไม่มียานพาหนะที่ได้รับมอบหมาย</p>
          <p className="text-xs text-slate-500 mt-1">กรุณาติดต่อผู้ดูแลระบบ (Admin)</p>
        </div>
      ) : (
        <section className="bg-gradient-to-r from-[#6D1396] via-[#570F78] to-[#3E0957] text-white rounded-2xl p-5 md:p-6 shadow-sm relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
            aria-hidden="true"
          />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-bold tracking-tight">{vehicle.license_plate}</h2>
                <span
                  className={clsx(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                    vehicle.status === "READY"
                      ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/30"
                      : "bg-amber-500/15 text-amber-200 border-amber-400/30",
                  )}
                >
                  <span
                    className={clsx(
                      "w-1.5 h-1.5 rounded-full",
                      vehicle.status === "READY" ? "bg-emerald-400" : "bg-amber-400",
                    )}
                    aria-hidden="true"
                  />
                  {vehicle.status === "READY" ? "พร้อมใช้งาน" : "กำลังซ่อมบำรุง"}
                </span>
              </div>
              <p className="text-sm text-purple-200/80">
                {vehicle.brand} {vehicle.model}
                {vehicle.color ? ` • สี${vehicle.color}` : ""}
              </p>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
              <p className="text-xs text-purple-200/70">เลขไมล์สะสมปัจจุบัน</p>
              <p className="text-2xl md:text-3xl font-bold tabular-nums mt-0.5">
                {(vehicle.current_mileage || 0).toLocaleString("th-TH")}{" "}
                <span className="text-sm font-normal text-purple-200/80">กม.</span>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Monthly Mileage Reminder (1st - 5th) */}
      {new Date().getDate() >= 1 && new Date().getDate() <= 5 && (
        hasLoggedThisMonth ? (
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-semibold text-emerald-900">บันทึกเลขไมล์ประจำเดือนนี้แล้ว</p>
              <p className="text-xs text-emerald-700 mt-0.5">ขอบคุณที่อัปเดตข้อมูลตรงเวลา</p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-semibold text-amber-900">แจ้งเตือนบันทึกเลขไมล์ประจำเดือน (วันที่ 1–5)</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  กรุณาอัปเดตเลขไมล์รถของคุณภายในวันที่ 5 ของเดือนนี้
                </p>
              </div>
            </div>
            <Link
              to="/driver/mileage"
              className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors"
            >
              บันทึกตอนนี้
            </Link>
          </div>
        )
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/driver/mileage"
          className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between gap-3 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-purple-50 text-[#8A1ABA] rounded-xl">
              <Gauge size={20} aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">บันทึกระยะทาง</h3>
              <p className="text-xs text-slate-500 mt-0.5">อัปเดตเลขไมล์ประจำเดือน</p>
            </div>
          </div>
          <ArrowUpRight
            size={18}
            className="text-slate-300 group-hover:text-[#8A1ABA] transition-colors"
            aria-hidden="true"
          />
        </Link>

        <Link
          to="/driver/repair"
          className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between gap-3 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
              <Wrench size={20} aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">แจ้งซ่อม / เบิกฉุกเฉิน</h3>
              <p className="text-xs text-slate-500 mt-0.5">ส่งคำขอซ่อมหรือเบิกสำรองจ่าย</p>
            </div>
          </div>
          <ArrowUpRight
            size={18}
            className="text-slate-300 group-hover:text-red-600 transition-colors"
            aria-hidden="true"
          />
        </Link>
      </div>

      {/* Maintenance Alerts */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">การแจ้งเตือนรอบบำรุงรักษา</h2>
          {alerts.length > 0 && (
            <span className="text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/70 px-2.5 py-0.5 rounded-full tabular-nums">
              {alerts.length} รายการ
            </span>
          )}
        </div>

        {alerts.length > 0 ? (
          <div className="space-y-2.5">
            {alerts.map((a) => (
              <div
                key={a.alert_id}
                className={clsx(
                  "p-3.5 rounded-xl border flex items-start justify-between gap-3",
                  a.status === "OVERDUE"
                    ? "bg-red-50/70 border-red-200/80"
                    : "bg-amber-50/70 border-amber-200/80",
                )}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">{a.alert_type}</p>
                  <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                    กำหนดรอบที่ {(a.next_service_mileage || 0).toLocaleString("th-TH")} กม.
                    {a.vehicle?.license_plate && ` • ${a.vehicle.license_plate}`}
                  </p>
                </div>
                <StatusBadge status={a.status} type="alert" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-emerald-50/60 text-emerald-800 p-4 rounded-xl border border-emerald-200/70 flex items-center gap-3">
            <ShieldCheck size={20} className="text-emerald-600 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-sm">ยานพาหนะอยู่ในสภาพพร้อมใช้งาน</p>
              <p className="text-xs text-emerald-700 mt-0.5">ไม่มีรายการแจ้งเตือนบำรุงรักษาค้างอยู่</p>
            </div>
          </div>
        )}
      </section>

      {/* Recent Repairs */}
      {repairs.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-base">ประวัติการแจ้งซ่อมล่าสุด</h2>
            <Link
              to="/driver/history"
              className="text-xs font-medium text-[#8A1ABA] hover:underline inline-flex items-center gap-1"
            >
              ดูทั้งหมด <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {repairs.map((r) => (
              <div
                key={r.request_id}
                className="px-5 py-3.5 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-[#8A1ABA] tabular-nums">
                      REQ-{String(r.request_id).padStart(4, "0")}
                    </span>
                    <span className="text-slate-500">{r.vehicle?.license_plate}</span>
                  </div>
                  <p className="text-sm text-slate-800 truncate">{r.issue_description}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 tabular-nums">
                    <Clock size={12} aria-hidden="true" />
                    {new Date(r.created_at).toLocaleDateString("th-TH")}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Monthly Forecast */}
      <MaintenanceForecastCard />
    </div>
  );
}
