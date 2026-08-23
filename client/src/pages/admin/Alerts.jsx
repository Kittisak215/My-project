import { useEffect, useState, useCallback } from "react";
import { Search, X, Bell, AlertTriangle } from "lucide-react";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import clsx from "clsx";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.get("/alerts", {
        params: { search, alert_type: filter },
      });
      setAlerts(res.data);
    } catch {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const notifyDriver = (vehicle) => {
    // ในระบบจริงอาจจะยิง API ไปที่ /notifications/send หรือ Line Notify
    const driverName = vehicle?.driver?.full_name || "คนขับ";
    toast.success(`ส่งการแจ้งเตือนไปยัง ${driverName} สำเร็จ`);
  };

  const alertTypeMap = {
    OIL_CHANGE: "เปลี่ยนถ่ายน้ำมันเครื่อง",
    TIRE_CHANGE: "เปลี่ยนยาง",
    GENERAL: "ซ่อมทั่วไป",
    MAINTENANCE: "บำรุงรักษาตามระยะ",
    EMERGENCY: "ซ่อมฉุกเฉิน",
    INSPECTION: "ตรวจสภาพรถ",
    OTHER: "อื่นๆ",
  };

  const getBadge = (status) => {
    if (status === "OVERDUE")
      return "bg-red-100 text-red-700 border border-red-200";
    if (status === "UPCOMING")
      return "bg-amber-100 text-amber-700 border border-amber-200";
    return "bg-slate-100 text-slate-500 border border-slate-200";
  };
  const getLabel = (status) => {
    if (status === "OVERDUE") return "เลยกำหนด";
    if (status === "UPCOMING") return "ใกล้ถึงกำหนด";
    return "ดำเนินการแล้ว";
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center bg-white p-4 rounded-xl shadow-sm mb-4 md:mb-6 gap-3 border border-slate-100">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาป้ายทะเบียน..."
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-full sm:w-56"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">ทุกประเภท</option>
            <option value="OIL_CHANGE">เปลี่ยนถ่ายน้ำมันเครื่อง</option>
            <option value="TIRE_CHANGE">เปลี่ยนยาง</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-base md:text-lg font-semibold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={20} />
            การแจ้งเตือนบำรุงรักษา
            <span className="bg-slate-100 text-slate-600 text-sm py-0.5 px-2.5 rounded-full ml-1 border border-slate-200">
              {alerts.filter((a) => a.status !== "DONE").length} รายการ
            </span>
          </h2>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading && (
            <p className="text-center py-8 text-slate-400">กำลังโหลด...</p>
          )}
          {!loading && alerts.length === 0 && (
            <p className="text-center py-8 text-slate-400">ไม่พบการแจ้งเตือน</p>
          )}
          {alerts.map((a) => (
            <div
              key={a.alert_id}
              className={clsx(
                "p-4",
                a.status === "OVERDUE" && "bg-red-50/30",
                a.status === "DONE" && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-slate-800">
                    {a.vehicle?.license_plate}
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.vehicle?.driver?.full_name || "-"}
                  </p>
                </div>
                <span
                  className={clsx(
                    "px-2.5 py-1 rounded-full text-xs font-medium",
                    getBadge(a.status),
                  )}
                >
                  {getLabel(a.status)}
                </span>
              </div>
              <p className="font-medium text-slate-700 text-sm mb-1">
                {alertTypeMap[a.alert_type] || a.alert_type}
              </p>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  ไมล์ล่าสุด: {(a.last_service_mileage || 0).toLocaleString()}{" "}
                  กม.
                </span>
                <span
                  className={clsx(
                    "font-semibold",
                    a.status === "OVERDUE" ? "text-red-600" : "text-slate-800",
                  )}
                >
                  กำหนด: {(a.next_service_mileage || 0).toLocaleString()} กม.
                </span>
              </div>
              {a.status !== "DONE" && (
                <div className="mt-3 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-400">ระบบส่งแจ้งเตือนอัตโนมัติแล้ว</span>
                  <button
                    onClick={() => notifyDriver(a.vehicle)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 py-2 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Bell size={14} /> เตือนซ้ำ
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">ทะเบียนรถ</th>
                <th className="px-6 py-4 font-semibold">ผู้รับผิดชอบ</th>
                <th className="px-6 py-4 font-semibold">ประเภทการบำรุงรักษา</th>
                <th className="px-6 py-4 font-semibold text-right">
                  ไมล์บำรุงรักษาล่าสุด
                </th>
                <th className="px-6 py-4 font-semibold text-right">
                  ไมล์กำหนดบำรุงรักษา
                </th>
                <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
                <th className="px-6 py-4 font-semibold text-center">
                  ดำเนินการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    กำลังโหลด...
                  </td>
                </tr>
              )}
              {!loading && alerts.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    ไม่พบการแจ้งเตือน
                  </td>
                </tr>
              )}
              {alerts.map((a) => (
                <tr
                  key={a.alert_id}
                  className={clsx(
                    "hover:bg-slate-50 transition-colors",
                    a.status === "OVERDUE" && "bg-red-50/30",
                    a.status === "DONE" && "opacity-60",
                  )}
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">
                      {a.vehicle?.license_plate}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {a.vehicle?.driver?.full_name || "-"}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">
                    {alertTypeMap[a.alert_type] || a.alert_type}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">
                    {(a.last_service_mileage || 0).toLocaleString()} กม.
                  </td>
                  <td
                    className={clsx(
                      "px-6 py-4 text-right font-semibold",
                      a.status === "OVERDUE"
                        ? "text-red-600"
                        : "text-slate-800",
                    )}
                  >
                    {(a.next_service_mileage || 0).toLocaleString()} กม.
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-medium",
                        getBadge(a.status),
                      )}
                    >
                      {getLabel(a.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {a.status !== "DONE" ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-slate-400 leading-none">ระบบแจ้งอัตโนมัติแล้ว</span>
                        <button
                          onClick={() => notifyDriver(a.vehicle)}
                          className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                        >
                          <Bell size={14} /> เตือนซ้ำ
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
