import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Car,
  Wrench,
  Bell,
  Banknote,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import MaintenanceForecastCard from "../../components/MaintenanceForecastCard";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import clsx from "clsx";

/* ─── Animation keyframes ─── */
const ANIM_STYLE = `
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes countUp {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

function injectStyle(id, css) {
  if (typeof document !== "undefined" && !document.getElementById(id)) {
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }
}

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

/* ─── Alert badge ─── */
const AlertBadge = ({ status }) => {
  if (status === "OVERDUE")
    return (
      <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
        เลยกำหนด
      </span>
    );
  if (status === "UPCOMING")
    return (
      <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
        ใกล้กำหนด
      </span>
    );
  return (
    <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
      แก้ไขแล้ว
    </span>
  );
};

/* ─── Skeleton loader ─── */
const Skeleton = ({ className }) => (
  <div
    className={clsx("rounded-2xl", className)}
    style={{
      background:
        "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
    }}
  />
);

/* ─── KPI Card ─── */
function KpiCard({
  label,
  value,
  unit,
  icon,
  iconClass,
  valueClass = "text-slate-900",
  delay = 0,
}) {
  return (
    <div
      className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-sm hover:shadow-md group flex items-start justify-between gap-3 transition-all duration-200"
      style={{ animation: `fadeSlideUp 0.4s ease-out ${delay}ms both` }}
    >
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
        <h3
          className={`text-xl md:text-2xl font-extrabold ${valueClass}`}
          style={{ animation: `countUp 0.4s ease-out ${delay + 100}ms both` }}
        >
          {value}{" "}
          <span className="text-sm font-medium text-slate-400">{unit}</span>
        </h3>
      </div>
      <div
        className={`p-2.5 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-105 ${iconClass}`}
      >
        {icon}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  injectStyle("admin-dash-anim", ANIM_STYLE);
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/reports/dashboard")
      .then((res) => {
        if (!cancelled) {
          setLoading(false);
          setError(false);
          setLastUpdated(new Date());
          
          setData({
            ...res.data,
            maintenanceAlerts: (res.data?.maintenanceAlerts || []).filter(
              (alert) => !alert.is_resolved,
            ),
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setError(true);
          toast.error("ไม่สามารถโหลดข้อมูล Dashboard ได้");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const stats = data?.stats || {};

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <Skeleton className="h-40 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  /* ─── Error ─── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-5">
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
          <AlertTriangle size={32} className="text-rose-500" />
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-slate-700 mb-1">
            ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้
          </p>
          <p className="text-sm text-slate-400">
            กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง
          </p>
        </div>
        <button
          onClick={() => setRetryKey((k) => k + 1)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            boxShadow: "0 4px 12px -2px rgba(124,58,237,0.4)",
          }}
        >
          <RefreshCw size={15} />
          ลองใหม่
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-violet-700 mb-1">ภาพรวมการจัดการ</p>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            แดชบอร์ดผู้ดูแลระบบ
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            สถานะรถยนต์ งานซ่อม และการบำรุงรักษา
          </p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3">
          {lastUpdated && (
            <p className="text-xs text-slate-500">
              อัปเดตล่าสุด{" "}
              {lastUpdated.toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            aria-label="รีเฟรชข้อมูลแดชบอร์ด"
          >
            <RefreshCw size={15} />
            รีเฟรช
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          label="รถพร้อมใช้"
          value={stats.readyVehicles || 0}
          unit="คัน"
          icon={<Car size={19} />}
          iconClass="bg-emerald-50 text-emerald-700"
          delay={0}
        />
        <KpiCard
          label="คำร้องรออนุมัติ"
          value={stats.pendingRepairs || 0}
          unit="รายการ"
          icon={<ClipboardList size={19} />}
          iconClass="bg-amber-50 text-amber-700"
          delay={50}
        />
        <KpiCard
          label="แจ้งเตือนเลยกำหนด"
          value={stats.overdueAlerts || 0}
          unit="รายการ"
          icon={<AlertTriangle size={19} />}
          iconClass="bg-rose-50 text-rose-700"
          valueClass={(stats.overdueAlerts || 0) > 0 ? "text-rose-700" : "text-slate-900"}
          delay={100}
        />
        <KpiCard
          label="ค่าซ่อมเดือนนี้"
          value={`฿${(stats.monthlyExpense || 0).toLocaleString("th-TH", {
            minimumFractionDigits: 2,
          })}`}
          unit=""
          icon={<Banknote size={19} />}
          iconClass="bg-violet-50 text-violet-700"
          delay={150}
        />
      </div>

      {/* ── Tables ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Alerts */}
        <div
          className="bg-white rounded-3xl border border-slate-100 overflow-hidden"
          style={{
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            animation: "fadeSlideUp 0.5s ease-out 0.28s both",
          }}
        >
          <div
            className="px-6 py-5 flex items-center justify-between"
            style={{
              borderBottom: "1px solid #f1f5f9",
              background: "linear-gradient(to right, #faf5ff, #f8fafc)",
            }}
          >
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-100">
                  <Bell size={14} className="text-amber-600" />
                </span>
                แจ้งเตือนบำรุงรักษา
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                รายการที่ยังไม่ได้แก้ไข
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                {data?.maintenanceAlerts?.length || 0} รายการ
              </span>
              <button
                type="button"
                onClick={() => navigate("/admin/alerts")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900 whitespace-nowrap"
              >
                ดูทั้งหมด <ArrowRight size={13} />
              </button>
            </div>
          </div>
          <div className="md:hidden divide-y divide-slate-50">
            {!data?.maintenanceAlerts?.length && (
              <div className="flex flex-col items-center py-10 gap-2">
                <CheckCircle2 size={28} className="text-emerald-300" />
                <p className="text-sm text-slate-400">ไม่มีการแจ้งเตือน</p>
              </div>
            )}
            {data?.maintenanceAlerts?.map((alert) => (
              <div
                key={alert.alert_id}
                onClick={() => navigate('/admin/alerts', { state: { openAlertId: alert.alert_id } })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate('/admin/alerts', { state: { openAlertId: alert.alert_id } });
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`เปิดการแจ้งเตือน ${alert.vehicle?.license_plate || ""}`}
                className="p-4 hover:bg-violet-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800 text-sm">
                    {alert.vehicle?.license_plate}
                  </p>
                  <AlertBadge
                    status={alert.status || (alert.is_resolved ? "DONE" : ((alert.vehicle?.current_mileage || 0) >= alert.next_service_mileage ? "OVERDUE" : "UPCOMING"))}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {alertTypeLabel[alert.alert_type] || alert.alert_type}
                </p>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead
                style={{
                  background: "#faf5ff",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    ทะเบียนรถ
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    ประเภท
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    สถานะ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {!data?.maintenanceAlerts?.length && (
                  <tr>
                    <td colSpan={3}>
                      <div className="flex flex-col items-center py-10 gap-2">
                        <CheckCircle2 size={28} className="text-emerald-300" />
                        <p className="text-sm text-slate-400">
                          ไม่มีการแจ้งเตือน
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {data?.maintenanceAlerts?.map((alert) => (
                  <tr
                    key={alert.alert_id}
                    onClick={() => navigate('/admin/alerts', { state: { openAlertId: alert.alert_id } })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate('/admin/alerts', { state: { openAlertId: alert.alert_id } });
                      }
                    }}
                    tabIndex={0}
                    aria-label={`เปิดการแจ้งเตือน ${alert.vehicle?.license_plate || ""}`}
                    className="transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:bg-violet-50"
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#faf5ff")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "")
                    }
                  >
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {alert.vehicle?.license_plate}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {alertTypeLabel[alert.alert_type] || alert.alert_type}
                    </td>
                    <td className="px-6 py-4">
                      <AlertBadge
                        status={alert.status || (alert.is_resolved ? "DONE" : ((alert.vehicle?.current_mileage || 0) >= alert.next_service_mileage ? "OVERDUE" : "UPCOMING"))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Repairs */}
        <div
          className="bg-white rounded-3xl border border-slate-100 overflow-hidden"
          style={{
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            animation: "fadeSlideUp 0.5s ease-out 0.36s both",
          }}
        >
          <div
            className="px-6 py-5 flex items-center justify-between"
            style={{
              borderBottom: "1px solid #f1f5f9",
              background: "linear-gradient(to right, #faf5ff, #f8fafc)",
            }}
          >
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-violet-100">
                  <Wrench size={14} className="text-violet-600" />
                </span>
                คำร้องซ่อมที่ต้องดำเนินการ
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                รายการรอตรวจสอบและรออนุมัติ
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/admin/repairs")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900 whitespace-nowrap"
            >
              ดูทั้งหมด <ArrowRight size={13} />
            </button>
          </div>
          <div className="md:hidden divide-y divide-slate-50">
            {!data?.recentRepairs?.length && (
              <div className="flex flex-col items-center py-10 gap-2">
                <Zap size={28} className="text-slate-200" />
                <p className="text-sm text-slate-400">ไม่มีคำร้องซ่อม</p>
              </div>
            )}
            {data?.recentRepairs?.map((r) => (
              <div
                key={r.request_id}
                onClick={() => navigate('/admin/repairs', { state: { openRequestId: r.request_id } })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate('/admin/repairs', { state: { openRequestId: r.request_id } });
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`เปิดคำร้องซ่อม ${r.vehicle?.license_plate || ""}`}
                className="p-4 hover:bg-violet-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-slate-800 text-sm">
                    {r.vehicle?.license_plate}
                  </p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {r.description}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(r.created_at).toLocaleDateString("th-TH", {
                    day: "2-digit",
                    month: "short",
                    year: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead
                style={{
                  background: "#faf5ff",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    วันที่
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    ทะเบียน / ปัญหา
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    สถานะ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {!data?.recentRepairs?.length && (
                  <tr>
                    <td colSpan={3}>
                      <div className="flex flex-col items-center py-10 gap-2">
                        <Zap size={28} className="text-slate-200" />
                        <p className="text-sm text-slate-400">
                          ไม่มีคำร้องซ่อม
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {data?.recentRepairs?.map((r) => (
                  <tr
                    key={r.request_id}
                    onClick={() => navigate('/admin/repairs', { state: { openRequestId: r.request_id } })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate('/admin/repairs', { state: { openRequestId: r.request_id } });
                      }
                    }}
                    tabIndex={0}
                    aria-label={`เปิดคำร้องซ่อม ${r.vehicle?.license_plate || ""}`}
                    className="transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:bg-violet-50"
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#faf5ff")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "")
                    }
                  >
                    <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString("th-TH", {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">
                        {r.vehicle?.license_plate}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 max-w-55 truncate">
                        {r.description}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Monthly Forecast ── */}
      <MaintenanceForecastCard />
    </div>
  );
}
