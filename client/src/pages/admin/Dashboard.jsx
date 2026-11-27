import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Car,
  Wrench,
  Bell,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  ArrowUpRight,
  Banknote,
} from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import MaintenanceForecastCard from "../../components/MaintenanceForecastCard";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import clsx from "clsx";

/* ─── Alert type label mapping ─── */
const alertTypeLabel = {
  OIL_CHANGE: "เปลี่ยนถ่ายน้ำมันเครื่อง",
  TIRE_CHANGE: "เปลี่ยนยาง",
  GENERAL: "ซ่อมทั่วไป",
  MAINTENANCE: "บำรุงรักษาตามระยะ",
  EMERGENCY: "ซ่อมฉุกเฉิน",
  เปลี่ยนถ่ายน้ำมันเครื่อง: "เปลี่ยนถ่ายน้ำมันเครื่อง",
  "เปลี่ยนยาง 4 เส้น": "เปลี่ยนยาง",
  เปลี่ยนยาง: "เปลี่ยนยาง",
};

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "2-digit",
  month: "short",
  year: "2-digit",
});

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/* ─── Alert badge ─── */
const AlertBadge = ({ status }) => {
  if (status === "OVERDUE") {
    return (
      <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200/80 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" aria-hidden="true" />
        เลยกำหนด
      </span>
    );
  }
  if (status === "UPCOMING") {
    return (
      <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/80 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
        ใกล้กำหนด
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 border border-slate-200/80 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">
      แก้ไขแล้ว
    </span>
  );
};

/* ─── Skeleton block ─── */
const SkeletonBlock = ({ className }) => (
  <div
    className={clsx("bg-slate-200/70 rounded-xl animate-pulse motion-reduce:animate-none", className)}
    aria-hidden="true"
  />
);

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchDashboard = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get("/reports/dashboard");
      const payload = res.data ? { ...res.data } : {};
      if (payload.maintenanceAlerts) {
        payload.maintenanceAlerts = payload.maintenanceAlerts.filter((a) => !a.is_resolved);
      }
      setData(payload);
      setError(false);
    } catch {
      setError(true);
      toast.error("ไม่สามารถโหลดข้อมูลภาพรวมได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(false);
  }, [fetchDashboard]);

  const stats = data?.stats || {};
  const maintenanceAlerts = data?.maintenanceAlerts || [];
  const recentRepairs = data?.recentRepairs || [];

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-10">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-7 w-56" />
            <SkeletonBlock className="h-4 w-72" />
          </div>
          <SkeletonBlock className="h-9 w-28" />
        </div>
        <SkeletonBlock className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonBlock className="h-72 rounded-2xl" />
          <SkeletonBlock className="h-72 rounded-2xl" />
        </div>
        <SkeletonBlock className="h-80 rounded-2xl" />
      </div>
    );
  }

  /* ─── Error ─── */
  if (error) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={24} aria-hidden="true" />
        </div>
        <h1 className="text-base font-semibold text-slate-900">
          ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้
        </h1>
        <p className="text-sm text-slate-500 mt-1.5">
          ตรวจสอบการเชื่อมต่อเครือข่าย แล้วกดรีเฟรชเพื่อโหลดข้อมูลอีกครั้ง
        </p>
        <button
          type="button"
          onClick={() => fetchDashboard(false)}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#8A1ABA] hover:bg-[#73149c] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] focus-visible:ring-offset-2 cursor-pointer"
        >
          <RefreshCw size={15} aria-hidden="true" />
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  const overdueCount = stats.overdueAlerts || 0;
  const pendingCount = stats.pendingRepairs || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight text-balance">
            ภาพรวมระบบซ่อมบำรุง
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            ติดตามสถานะความพร้อมยานพาหนะ คำร้องซ่อม และกำหนดการบำรุงรักษา
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchDashboard(true)}
          disabled={refreshing}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] focus-visible:ring-offset-2 disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw
            size={15}
            className={clsx(refreshing && "animate-spin motion-reduce:animate-none")}
            aria-hidden="true"
          />
          {refreshing ? "กำลังอัปเดต…" : "อัปเดตข้อมูล"}
        </button>
      </div>

      {/* ── Unified Operational KPI Strip ── */}
      <section
        aria-label="ตัวชี้วัดหลักของระบบ"
        className="bg-white rounded-2xl border border-purple-200/70 border-t-[3px] border-t-[#8A1ABA] shadow-xs overflow-hidden"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80">
          {/* KPI 1: Ready Vehicles */}
          <Link
            to="/admin/vehicles"
            className="group p-5 flex flex-col justify-between hover:bg-slate-50/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8A1ABA]"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <Car size={15} className="text-emerald-600" aria-hidden="true" />
                รถพร้อมใช้งาน
              </span>
              <ArrowUpRight
                size={15}
                className="text-slate-300 group-hover:text-slate-600 transition-colors"
                aria-hidden="true"
              />
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl md:text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
                {(stats.readyVehicles || 0).toLocaleString("th-TH")}
              </span>
              <span className="text-sm text-slate-500">คัน</span>
            </div>
            <p className="text-xs text-emerald-700 font-medium mt-2">
              สถานะปกติ พร้อมออกปฏิบัติงาน
            </p>
          </Link>

          {/* KPI 2: Pending Repairs */}
          <Link
            to="/admin/repairs"
            className="group p-5 flex flex-col justify-between hover:bg-slate-50/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8A1ABA] sm:border-t-0 lg:border-t-0"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <ClipboardList size={15} className="text-[#8A1ABA]" aria-hidden="true" />
                คำร้องซ่อมรออนุมัติ
              </span>
              <ArrowUpRight
                size={15}
                className="text-slate-300 group-hover:text-slate-600 transition-colors"
                aria-hidden="true"
              />
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl md:text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
                {pendingCount.toLocaleString("th-TH")}
              </span>
              <span className="text-sm text-slate-500">รายการ</span>
            </div>
            <p
              className={clsx(
                "text-xs font-medium mt-2",
                pendingCount > 0 ? "text-[#8A1ABA]" : "text-slate-500",
              )}
            >
              {pendingCount > 0 ? "รอตรวจสอบและดำเนินการ" : "ไม่มีรายการค้างอนุมัติ"}
            </p>
          </Link>

          {/* KPI 3: Overdue Alerts */}
          <Link
            to="/admin/alerts"
            className="group p-5 flex flex-col justify-between hover:bg-slate-50/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8A1ABA] sm:border-t lg:border-t-0"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <Bell
                  size={15}
                  className={overdueCount > 0 ? "text-red-600" : "text-slate-400"}
                  aria-hidden="true"
                />
                แจ้งเตือนครบระยะ
              </span>
              <ArrowUpRight
                size={15}
                className="text-slate-300 group-hover:text-slate-600 transition-colors"
                aria-hidden="true"
              />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span
                className={clsx(
                  "text-2xl md:text-3xl font-bold tabular-nums tracking-tight",
                  overdueCount > 0 ? "text-red-600" : "text-slate-900",
                )}
              >
                {overdueCount.toLocaleString("th-TH")}
              </span>
              <span className="text-sm text-slate-500">รายการ</span>
            </div>
            <p
              className={clsx(
                "text-xs font-medium mt-2 flex items-center gap-1",
                overdueCount > 0 ? "text-red-600" : "text-emerald-700",
              )}
            >
              {overdueCount > 0 ? (
                <>
                  <AlertTriangle size={13} aria-hidden="true" />
                  เลยกำหนด ต้องเร่งดำเนินการ
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} aria-hidden="true" />
                  ไม่มีรายการเลยกำหนด
                </>
              )}
            </p>
          </Link>

          {/* KPI 4: Monthly Expense */}
          <div className="p-5 flex flex-col justify-between bg-slate-50/40 sm:border-t lg:border-t-0">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <Banknote size={15} className="text-slate-600" aria-hidden="true" />
                ค่าซ่อมบำรุงเดือนนี้
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1 min-w-0">
              <span className="text-lg font-semibold text-slate-400">฿</span>
              <span className="text-2xl md:text-3xl font-bold text-slate-900 tabular-nums tracking-tight truncate">
                {currencyFormatter.format(stats.monthlyExpense || 0)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              ยอดสะสมประจำเดือนปัจจุบัน
            </p>
          </div>
        </div>
      </section>

      {/* ── Action Queues: Alerts & Repairs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Alerts Queue */}
        <section className="bg-white rounded-2xl border border-purple-200/60 shadow-xs flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-purple-100/80 bg-purple-50/40 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900 truncate">
                  แจ้งเตือนบำรุงรักษา
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/70 tabular-nums">
                  {maintenanceAlerts.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                รายการที่ยังไม่ได้ดำเนินการแก้ไข
              </p>
            </div>
            <Link
              to="/admin/alerts"
              className="text-xs font-medium text-[#8A1ABA] hover:text-[#6b1291] shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-purple-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
            >
              ดูทั้งหมด
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {maintenanceAlerts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
              <CheckCircle2 size={28} className="text-emerald-500 mb-2" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700">ไม่มีรายการแจ้งเตือนค้างอยู่</p>
              <p className="text-xs text-slate-400 mt-0.5">รถทุกคันอยู่ในรอบบำรุงรักษาปกติ</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {maintenanceAlerts.map((alert) => {
                const status =
                  alert.status ||
                  (alert.is_resolved
                    ? "DONE"
                    : (alert.vehicle?.current_mileage || 0) >= alert.next_service_mileage
                      ? "OVERDUE"
                      : "UPCOMING");
                return (
                  <button
                    key={alert.alert_id}
                    type="button"
                    onClick={() =>
                      navigate("/admin/alerts", { state: { openAlertId: alert.alert_id } })
                    }
                    className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8A1ABA] cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {alert.vehicle?.license_plate || "ไม่ระบุทะเบียน"}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {alertTypeLabel[alert.alert_type] || alert.alert_type}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <AlertBadge status={status} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Repairs Queue */}
        <section className="bg-white rounded-2xl border border-purple-200/60 shadow-xs flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-purple-100/80 bg-purple-50/40 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900 truncate">
                  คำร้องซ่อมที่ต้องดำเนินการ
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-[#8A1ABA] border border-purple-200/70 tabular-nums">
                  {recentRepairs.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                รายการรอตรวจสอบและรออนุมัติล่าสุด
              </p>
            </div>
            <Link
              to="/admin/repairs"
              className="text-xs font-medium text-[#8A1ABA] hover:text-[#6b1291] shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-purple-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
            >
              ดูทั้งหมด
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {recentRepairs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
              <Wrench size={26} className="text-slate-300 mb-2" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700">ไม่มีคำร้องซ่อมรอดำเนินการ</p>
              <p className="text-xs text-slate-400 mt-0.5">คำร้องทั้งหมดได้รับการจัดการเรียบร้อยแล้ว</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentRepairs.map((r) => (
                <button
                  key={r.request_id}
                  type="button"
                  onClick={() =>
                    navigate("/admin/repairs", { state: { openRequestId: r.request_id } })
                  }
                  className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8A1ABA] cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {r.vehicle?.license_plate || "ไม่ระบุทะเบียน"}
                      </span>
                      <span className="text-xs text-slate-400 shrink-0 tabular-nums">
                        {dateFormatter.format(new Date(r.created_at))}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {r.description || "ไม่ได้ระบุรายละเอียด"}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={r.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Monthly Maintenance Forecast Table ── */}
      <MaintenanceForecastCard />
    </div>
  );
}
