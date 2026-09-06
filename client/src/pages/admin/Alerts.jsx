import { useEffect, useState, useCallback } from "react";
import { Search, X, Bell, AlertTriangle, CheckCircle2 } from "lucide-react";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import Skeleton from "../../components/Skeleton";
import clsx from "clsx";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState("ACTIVE");
  const [resolveModalAlert, setResolveModalAlert] = useState(null);
  const [serviceMileageInput, setServiceMileageInput] = useState("");
  const [resolving, setResolving] = useState(false);
  const [remindingId, setRemindingId] = useState(null);

  const displayedAlerts = alerts.filter((a) =>
    activeTab === "ACTIVE" ? a.status !== "DONE" : a.status === "DONE"
  );

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

  const handleRemindDriver = async (alert) => {
    const driverName = alert.vehicle?.driver?.full_name || "คนขับ";
    setRemindingId(alert.alert_id);
    try {
      const res = await api.post(`/alerts/${alert.alert_id}/remind`);
      toast.success(res.data?.message || `ส่งการแจ้งเตือนซ้ำไปยัง ${driverName} สำเร็จ`);
      fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาดในการส่งแจ้งเตือนซ้ำ");
    } finally {
      setRemindingId(null);
    }
  };

  const openResolveModal = (alert) => {
    setResolveModalAlert(alert);
    setServiceMileageInput(
      alert.vehicle?.current_mileage || alert.next_service_mileage || ""
    );
  };

  const handleConfirmResolve = async () => {
    if (!resolveModalAlert) return;
    setResolving(true);
    try {
      await api.put(`/alerts/${resolveModalAlert.alert_id}`, {
        is_resolved: true,
        service_mileage: serviceMileageInput ? parseInt(serviceMileageInput) : undefined,
      });
      toast.success(
        `ปิดการแจ้งเตือนรถ ${resolveModalAlert.vehicle?.license_plate} เรียบร้อยแล้ว (บันทึกลงประวัติ)`
      );
      setResolveModalAlert(null);
      fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setResolving(false);
    }
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
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-violet-500 w-full sm:w-56"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-violet-500"
          >
            <option value="">ทุกประเภท</option>
            <option value="OIL_CHANGE">เปลี่ยนถ่ายน้ำมันเครื่อง</option>
            <option value="TIRE_CHANGE">เปลี่ยนยาง</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 md:px-6 pt-5 pb-0 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 mb-4">
            <AlertTriangle className="text-amber-500" size={22} />
            การจัดการแจ้งเตือนบำรุงรักษา
          </h2>
          
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={clsx(
                "pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
                activeTab === "ACTIVE" ? "border-amber-500 text-amber-700" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              รายการที่ต้องดำเนินการ
              <span className={clsx("py-0.5 px-2 rounded-full text-xs", activeTab === "ACTIVE" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600")}>
                {alerts.filter(a => a.status !== "DONE").length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("HISTORY")}
              className={clsx(
                "pb-3 text-sm font-bold border-b-2 transition-colors",
                activeTab === "HISTORY" ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              ประวัติ (ดำเนินการแล้ว)
            </button>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading && (
            <div className="space-y-4 p-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}
          {!loading && displayedAlerts.length === 0 && (
            <p className="text-center py-8 text-slate-400">ไม่พบรายการในหมวดหมู่นี้</p>
          )}
          {!loading &&
            displayedAlerts.map((a) => (
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
                <div className="flex flex-col gap-1 mt-2 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>ไมล์รอบที่แล้ว</span>
                    <span className="font-medium text-slate-700">
                      {(a.last_service_mileage || 0).toLocaleString()} กม.
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>ไมล์กำหนดรอบถัดไป</span>
                    <span
                      className={clsx(
                        "font-semibold",
                        a.status === "OVERDUE"
                          ? "text-red-600"
                          : "text-slate-800",
                      )}
                    >
                      {(a.next_service_mileage || 0).toLocaleString()} กม.
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-slate-200/60 mt-1">
                    <span>ระยะทางปัจจุบัน</span>
                    <span
                      className={clsx(
                        a.status === "OVERDUE"
                          ? "text-red-600"
                          : a.status === "DONE"
                            ? "text-slate-500"
                            : "text-amber-600",
                      )}
                    >
                      {(a.vehicle?.current_mileage || 0).toLocaleString()} กม.
                      {a.status !== "DONE" &&
                        (a.status === "OVERDUE" ? (
                          <span className="text-red-500 font-bold ml-1">
                            (เกิน{" "}
                            {(
                              (a.vehicle?.current_mileage || 0) -
                              (a.next_service_mileage || 0)
                            ).toLocaleString()}{" "}
                            กม.)
                          </span>
                        ) : (
                          <span className="text-amber-500 font-bold ml-1">
                            (เหลือ{" "}
                            {(
                              (a.next_service_mileage || 0) -
                              (a.vehicle?.current_mileage || 0)
                            ).toLocaleString()}{" "}
                            กม.)
                          </span>
                        ))}
                    </span>
                  </div>
                </div>
                {a.status !== "DONE" && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => handleRemindDriver(a)}
                      disabled={remindingId === a.alert_id}
                      className={clsx(
                        "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all border cursor-pointer active:scale-95 shadow-2xs",
                        a.remind_count > 0
                          ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200",
                        remindingId === a.alert_id && "opacity-60 cursor-not-allowed",
                      )}
                      title={
                        a.remind_count > 0
                          ? `ส่งเตือนซ้ำแล้ว ${a.remind_count} ครั้ง`
                          : "ส่งการแจ้งเตือนซ้ำไปยังหน้าจอคนขับ"
                      }
                    >
                      <Bell
                        size={13}
                        className={clsx(
                          remindingId === a.alert_id
                            ? "animate-spin text-indigo-600"
                            : a.remind_count > 0
                              ? "text-amber-600"
                              : "text-slate-400",
                        )}
                      />
                      <span>{remindingId === a.alert_id ? "กำลังส่ง..." : "เตือนซ้ำ"}</span>
                      {a.remind_count > 0 && (
                        <span className="inline-flex items-center justify-center px-1.5 py-0.2 bg-amber-200/90 text-amber-900 rounded-full text-[10px] font-bold">
                          {a.remind_count}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => openResolveModal(a)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg text-xs transition-all shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 size={13} />
                      <span>จัดการแล้ว</span>
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
              {!loading && displayedAlerts.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    ไม่พบรายการในหมวดหมู่นี้
                  </td>
                </tr>
              )}
              {displayedAlerts.map((a) => (
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
                    <div className="text-xs text-slate-400 mb-0.5">
                      ไมล์รอบที่แล้ว:{" "}
                      {(a.last_service_mileage || 0).toLocaleString()}
                    </div>
                    <div className="font-semibold text-slate-800">
                      ปัจจุบัน:{" "}
                      {(a.vehicle?.current_mileage || 0).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div
                      className={clsx(
                        "font-semibold",
                        a.status === "OVERDUE"
                          ? "text-red-600"
                          : a.status === "DONE"
                            ? "text-slate-500"
                            : "text-slate-800",
                      )}
                    >
                      {(a.next_service_mileage || 0).toLocaleString()} กม.
                    </div>
                    {a.status !== "DONE" && (
                      <div
                        className={clsx(
                          "text-xs font-bold mt-0.5",
                          a.status === "OVERDUE"
                            ? "text-red-500"
                            : "text-amber-500",
                        )}
                      >
                        {a.status === "OVERDUE"
                          ? `(เกิน ${((a.vehicle?.current_mileage || 0) - (a.next_service_mileage || 0)).toLocaleString()} กม.)`
                          : `(เหลือ ${((a.next_service_mileage || 0) - (a.vehicle?.current_mileage || 0)).toLocaleString()} กม.)`}
                      </div>
                    )}
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
                      <div className="inline-flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleRemindDriver(a)}
                          disabled={remindingId === a.alert_id}
                          className={clsx(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer shadow-2xs active:scale-95",
                            a.remind_count > 0
                              ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 hover:border-amber-300"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200",
                            remindingId === a.alert_id && "opacity-60 cursor-not-allowed",
                          )}
                          title={
                            a.remind_count > 0
                              ? `ส่งเตือนซ้ำแล้ว ${a.remind_count} ครั้ง (คลิกเพื่อส่งซ้ำอีก)`
                              : "ส่งการแจ้งเตือนซ้ำไปยังหน้าจอคนขับ"
                          }
                        >
                          <Bell
                            size={13}
                            className={clsx(
                              remindingId === a.alert_id
                                ? "animate-spin text-indigo-600"
                                : a.remind_count > 0
                                  ? "text-amber-600"
                                  : "text-slate-400",
                            )}
                          />
                          <span>{remindingId === a.alert_id ? "กำลังส่ง..." : "เตือนซ้ำ"}</span>
                          {a.remind_count > 0 && (
                            <span className="inline-flex items-center justify-center px-1.5 py-0.2 bg-amber-200/90 text-amber-900 rounded-full text-[10px] font-bold">
                              {a.remind_count}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => openResolveModal(a)}
                          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                          title="บันทึกและปิดการแจ้งเตือนนี้"
                        >
                          <CheckCircle2 size={13} />
                          <span>จัดการแล้ว</span>
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 text-xs font-semibold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span>ดำเนินการแล้ว</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolve Confirmation Modal */}
      {resolveModalAlert && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                บันทึกดำเนินการบำรุงรักษาแล้ว
              </h3>
              <button
                onClick={() => setResolveModalAlert(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">ทะเบียนรถ:</span>
                  <span className="font-bold text-slate-800">{resolveModalAlert.vehicle?.license_plate}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">รายการ:</span>
                  <span className="font-semibold text-purple-700">{alertTypeMap[resolveModalAlert.alert_type] || resolveModalAlert.alert_type}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">กำหนดรอบเดิม:</span>
                  <span className="text-slate-700 font-medium">{(resolveModalAlert.next_service_mileage || 0).toLocaleString()} กม.</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  เลขไมล์ที่ดำเนินการเสร็จสิ้น (กม.) *
                </label>
                <input
                  type="number"
                  value={serviceMileageInput}
                  onChange={(e) => setServiceMileageInput(e.target.value)}
                  placeholder="เช่น 15950"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8A1ABA]/20 focus:border-[#8A1ABA] bg-white font-semibold text-slate-800"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  เลขไมล์นี้จะถูกบันทึกไว้ในประวัติและนำไปใช้คำนวณรอบบำรุงรักษาครั้งถัดไป
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={resolving}
                  onClick={() => setResolveModalAlert(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={resolving}
                  onClick={handleConfirmResolve}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 size={15} />
                  <span>{resolving ? "กำลังบันทึก..." : "ยืนยันปิดแจ้งเตือน"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
