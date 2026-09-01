import { useEffect, useState } from "react";
import {
  Car,
  Wrench,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Clock,
  ShieldCheck,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import MaintenanceForecastCard from "../../components/MaintenanceForecastCard";
import clsx from "clsx";

export default function DriverDashboard() {
  const { user } = useAuthStore();
  const [vehicles, setVehicles] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [_loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    const driverId = user?.driver_id || user?.driver?.driver_id;
    Promise.all([
      api.get("/vehicles", { params: { limit: 100, is_active: "true" } }),
      api.get("/repairs", { params: { limit: 5 } }),
      api.get("/alerts"),
    ])
      .then(([vRes, rRes, aRes]) => {
        const driverVehicles = vRes.data.data.filter(
          (v) => (v.driver_id || v.driverId) === driverId,
        );
        const vehicleIds = driverVehicles.map((v) => v.vehicle_id);
        setVehicles(driverVehicles);
        setRepairs(
          rRes.data.data.filter((r) => vehicleIds.includes(r.vehicle_id)),
        );
        setAlerts(
          aRes.data
            .filter(
              (a) => a.status !== "DONE" && vehicleIds.includes(a.vehicle_id),
            )
            .slice(0, 5),
        );
      })
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [user?.driver_id, user?.driver?.driver_id]);

  const displayName =
    user?.full_name || user?.driver?.full_name || user?.username;
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Welcome & Vehicle Hero Card */}
      <div className="space-y-4">
        {/* Welcome & Nav */}
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-0.5">ยินดีต้อนรับสู่ระบบ</p>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">{displayName}</h1>
        </div>

        {vehicles.length > 1 && (
          <div className="pt-1">
            <div className="relative">
                <select
                  value={selectedIdx}
                  onChange={(e) => setSelectedIdx(parseInt(e.target.value))}
                  className="w-full appearance-none bg-white border border-slate-200/80 text-slate-800 font-bold text-sm md:text-base rounded-xl px-4 py-3.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all cursor-pointer shadow-xs"
                >
                  {vehicles.map((v, i) => (
                    <option key={v.vehicle_id || v.id} value={i}>
                      🚗 {v.license_plate} ({v.brand} {v.model})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
          </div>
        )}

        {vehicles.length === 0 ? (
          <div className="bg-slate-50 rounded-2xl p-6 text-center border border-slate-200 shadow-xs">
            <p className="text-slate-600 text-sm font-bold">ยังไม่มียานพาหนะที่ได้รับมอบหมาย</p>
            <p className="text-xs text-slate-500 mt-1">กรุณาติดต่อผู้ดูแลระบบ (Admin)</p>
          </div>
        ) : (
          /* "Credit Card" Vehicle View */
          <div 
            className="rounded-2xl p-5 md:p-6 text-white shadow-md relative overflow-hidden transition-all duration-300 transform hover:scale-[1.01]"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
          >
            {/* Minimal Background accents */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-900/40 rounded-full blur-xl"></div>
            
            <div className="relative z-10 flex flex-col gap-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md shadow-sm shrink-0 border border-white/20">
                    <Car size={24} className="text-white drop-shadow-sm" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight drop-shadow-sm">{vehicle.license_plate}</h2>
                    <p className="text-xs text-indigo-100 font-semibold opacity-90 mt-0.5">{vehicle.brand} {vehicle.model}</p>
                  </div>
                </div>
                
                <span
                  className={clsx(
                    "px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold shrink-0 flex items-center gap-1.5 border backdrop-blur-md shadow-sm",
                    vehicle.status === "READY"
                      ? "bg-emerald-400/20 text-emerald-50 border-emerald-400/40"
                      : "bg-amber-400/20 text-amber-50 border-amber-400/40",
                  )}
                >
                  {vehicle.status === "READY" ? <ShieldCheck size={14} /> : <Wrench size={14} />}
                  {vehicle.status === "READY" ? "พร้อมใช้งาน" : "ซ่อมบำรุง"}
                </span>
              </div>
              
              <div className="flex items-end justify-between pt-3 border-t border-white/20 mt-1">
                <div>
                  <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold mb-1">ไมล์สะสมปัจจุบัน</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black drop-shadow-sm">{(vehicle.current_mileage || 0).toLocaleString()}</span>
                    <span className="text-xs text-indigo-100 font-semibold">กม.</span>
                  </div>
                </div>
                <Gauge size={40} className="text-white/20 mb-1" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Reminder Banner */}
      {new Date().getDate() >= 1 && new Date().getDate() <= 5 && (
        hasLoggedThisMonth ? (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-2xl p-4 md:p-5 flex items-start gap-3 md:gap-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="p-2.5 bg-emerald-100/80 text-emerald-600 rounded-xl shrink-0 shadow-xs">
              <CheckCircle size={22} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-emerald-900 text-sm md:text-base tracking-tight">
                  บันทึกไมล์สำเร็จแล้ว!
                </h3>
              </div>
              <p className="text-xs md:text-sm text-emerald-700 mt-1.5 leading-relaxed font-medium">
                ✅ คุณได้อัปเดตเลขไมล์ประจำเดือนนี้เรียบร้อยแล้ว ขอบคุณครับ
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-4 md:p-5 flex items-start gap-3 md:gap-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="p-2.5 bg-amber-100/80 text-amber-600 rounded-xl shrink-0 shadow-xs">
              <AlertCircle size={22} className="animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-amber-900 text-sm md:text-base tracking-tight">
                  แจ้งเตือนประจำเดือน!
                </h3>
                <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                  วันที่ 1-5
                </span>
              </div>
              <p className="text-xs md:text-sm text-amber-700 mt-1.5 leading-relaxed font-medium">
                ได้เวลาบันทึกเลขไมล์ประจำเดือนแล้วครับ
                อย่าลืมเข้าไปอัปเดตเลขไมล์รถของคุณที่เมนู{" "}
                <Link
                  to="/driver/mileage"
                  className="font-bold underline decoration-amber-400 underline-offset-2"
                >
                  "อัปเดตเลขไมล์"
                </Link>{" "}
                ภายในวันที่ 5 นี้นะครับ
              </p>
            </div>
          </div>
        )
      )}


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
            {alerts.map((a) => (
              <div
                key={a.alert_id}
                className={clsx(
                  "p-4 rounded-xl border-l-4 flex items-start justify-between gap-3",
                  a.status === "OVERDUE"
                    ? "bg-red-50/80 border-red-500"
                    : "bg-amber-50/80 border-amber-400",
                )}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={20}
                    className={
                      a.status === "OVERDUE"
                        ? "text-red-500 shrink-0 mt-0.5"
                        : "text-amber-500 shrink-0 mt-0.5"
                    }
                  />
                  <div>
                    <p
                      className={clsx(
                        "font-bold text-sm",
                        a.status === "OVERDUE"
                          ? "text-red-900"
                          : "text-amber-900",
                      )}
                    >
                      {a.alert_type}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      กำหนดเปลี่ยนถ่ายที่ระยะ{" "}
                      {(a.next_service_mileage || 0).toLocaleString()} กม.
                    </p>
                    {a.vehicle?.license_plate && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        ทะเบียน: {a.vehicle.license_plate}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={clsx(
                    "text-[11px] font-bold px-2 py-0.5 rounded-md self-start shrink-0",
                    a.status === "OVERDUE"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-800",
                  )}
                >
                  {a.status === "OVERDUE" ? "⚠️ เกินกำหนด" : "⏳ ใกล้ถึงรอบ"}
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
              <p className="text-xs text-emerald-700 mt-0.5">
                ไม่มีรายการแจ้งเตือนบำรุงรักษาค้างอยู่
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/driver/mileage"
          className="bg-white hover:bg-purple-50/40 border border-slate-200/80 hover:border-purple-300 rounded-2xl p-5 shadow-xs hover:shadow-md hover:shadow-purple-900/10 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-purple-100 text-[#8A1ABA] rounded-xl group-hover:scale-105 transition-transform">
              <Gauge size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                บันทึกระยะทาง
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                อัปเดตเลขไมล์ประจำเดือน
              </p>
            </div>
          </div>
          <ArrowRight
            size={18}
            className="text-slate-400 group-hover:text-[#8A1ABA] group-hover:translate-x-1 transition-all"
          />
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
              <h3 className="font-bold text-slate-800 text-base">
                แจ้งซ่อม / เบิกฉุกเฉิน
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ส่งคำขอเข้าซ่อมหรือเบิกสำรองจ่าย
              </p>
            </div>
          </div>
          <ArrowRight
            size={18}
            className="text-slate-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all"
          />
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
            <Link
              to="/driver/history"
              className="text-xs font-bold text-[#8A1ABA] hover:underline flex items-center gap-1"
            >
              ดูทั้งหมด <ArrowRight size={13} />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {repairs.map((r) => (
              <div
                key={r.request_id}
                className="p-4 md:p-5 flex items-start justify-between gap-3 hover:bg-slate-50/60 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-600 text-xs bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      REQ-{String(r.request_id).padStart(4, "0")}
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      {r.vehicle?.license_plate}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800">
                    {r.issue_description}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={12} />{" "}
                    {new Date(r.created_at).toLocaleDateString("th-TH")}
                  </p>
                </div>
                <span
                  className={clsx(
                    "px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap shrink-0 border",
                    r.status === "COMPLETED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : r.status === "PENDING"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-blue-50 text-blue-700 border-blue-200",
                  )}
                >
                  {r.status === "COMPLETED"
                    ? "✅ เสร็จสิ้น"
                    : r.status === "PENDING"
                      ? "📝 รอตรวจสอบ"
                      : "🔧 กำลังดำเนินการ"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Forecast Card */}
      <MaintenanceForecastCard />
    </div>
  );
}
