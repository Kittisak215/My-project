import { useEffect, useState, useCallback } from "react";
import { Search, Bell, CheckCircle2 } from "lucide-react";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import Skeleton from "../../components/Skeleton";
import StatusBadge from "../../components/StatusBadge";
import Modal from "../../components/Modal";
import clsx from "clsx";

const alertTypeMap = {
  OIL_CHANGE: "เปลี่ยนถ่ายน้ำมันเครื่อง",
  TIRE_CHANGE: "เปลี่ยนยาง",
  GENERAL: "ซ่อมทั่วไป",
  MAINTENANCE: "บำรุงรักษาตามระยะ",
  EMERGENCY: "ซ่อมฉุกเฉิน",
  INSPECTION: "ตรวจสภาพรถ",
  OTHER: "อื่นๆ",
};

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

  const activeAlertsCount = alerts.filter((a) => a.status !== "DONE").length;
  const historyAlertsCount = alerts.filter((a) => a.status === "DONE").length;

  const displayedAlerts = alerts.filter((a) =>
    activeTab === "ACTIVE" ? a.status !== "DONE" : a.status === "DONE",
  );

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.get("/alerts", {
        params: { search, alert_type: filter },
      });
      setAlerts(res.data || []);
    } catch {
      toast.error("โหลดข้อมูลแจ้งเตือนไม่สำเร็จ");
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
      toast.success(res.data?.message || `ส่งการแจ้งเตือนซ้ำไปยัง ${driverName} แล้ว`);
      fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาดในการส่งแจ้งเตือนซ้ำ");
    } finally {
      setRemindingId(null);
    }
  };

  const openResolveModal = (alert) => {
    setResolveModalAlert(alert);
    setServiceMileageInput(alert.vehicle?.current_mileage || alert.next_service_mileage || "");
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
        `ปิดการแจ้งเตือนรถ ${resolveModalAlert.vehicle?.license_plate} แล้ว (บันทึกลงประวัติ)`,
      );
      setResolveModalAlert(null);
      fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-10">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          แจ้งเตือนบำรุงรักษาตามระยะ
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          ติดตามรถที่ใกล้ถึงหรือเลยกำหนดเปลี่ยนถ่ายน้ำมันเครื่องและยางรถยนต์
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <label htmlFor="alert-search" className="sr-only">
            ค้นหาป้ายทะเบียน
          </label>
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="alert-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาป้ายทะเบียน…"
            autoComplete="off"
            spellCheck={false}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] transition-colors"
          />
        </div>
        <div>
          <label htmlFor="alert-type-filter" className="sr-only">
            กรองตามประเภทการบำรุงรักษา
          </label>
          <select
            id="alert-type-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-52 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] transition-colors"
          >
            <option value="">ทุกประเภท</option>
            <option value="OIL_CHANGE">เปลี่ยนถ่ายน้ำมันเครื่อง</option>
            <option value="TIRE_CHANGE">เปลี่ยนยาง</option>
          </select>
        </div>
      </div>

      {/* Main Card with Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
        <div
          className="px-5 pt-4 border-b border-slate-100 flex items-center gap-6"
          role="tablist"
          aria-label="หมวดหมู่แจ้งเตือน"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "ACTIVE"}
            onClick={() => setActiveTab("ACTIVE")}
            className={clsx(
              "pb-3.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer",
              activeTab === "ACTIVE"
                ? "border-[#8A1ABA] text-[#8A1ABA]"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            รายการที่ต้องดำเนินการ
            <span
              className={clsx(
                "px-2 py-0.5 rounded-full text-xs tabular-nums",
                activeTab === "ACTIVE"
                  ? "bg-purple-50 text-[#8A1ABA]"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              {activeAlertsCount}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "HISTORY"}
            onClick={() => setActiveTab("HISTORY")}
            className={clsx(
              "pb-3.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer",
              activeTab === "HISTORY"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            ประวัติ (ดำเนินการแล้ว)
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 tabular-nums">
              {historyAlertsCount}
            </span>
          </button>
        </div>

        {/* Mobile List */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading && (
            <div className="space-y-3 p-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
          {!loading && displayedAlerts.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">
              ไม่พบรายการในหมวดหมู่นี้
            </div>
          )}
          {!loading &&
            displayedAlerts.map((a) => {
              const current = a.vehicle?.current_mileage || 0;
              const next = a.next_service_mileage || 0;
              const diff = next - current;
              return (
                <div
                  key={a.alert_id}
                  className={clsx("p-4 space-y-3", a.status === "DONE" && "opacity-65")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{a.vehicle?.license_plate}</p>
                      <p className="text-xs text-slate-500">{a.vehicle?.driver?.full_name || "-"}</p>
                    </div>
                    <StatusBadge status={a.status} type="alert" />
                  </div>
                  <p className="text-sm font-medium text-slate-800">
                    {alertTypeMap[a.alert_type] || a.alert_type}
                  </p>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs space-y-1 tabular-nums">
                    <div className="flex justify-between text-slate-500">
                      <span>ไมล์ปัจจุบัน</span>
                      <span className="font-semibold text-slate-800">
                        {current.toLocaleString("th-TH")} กม.
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>กำหนดรอบถัดไป</span>
                      <span
                        className={clsx(
                          "font-semibold",
                          a.status === "OVERDUE" ? "text-red-600" : "text-slate-800",
                        )}
                      >
                        {next.toLocaleString("th-TH")} กม.
                        {a.status !== "DONE" &&
                          (diff <= 0
                            ? ` (เกิน ${Math.abs(diff).toLocaleString("th-TH")})`
                            : ` (เหลือ ${diff.toLocaleString("th-TH")})`)}
                      </span>
                    </div>
                  </div>
                  {a.status !== "DONE" && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRemindDriver(a)}
                        disabled={remindingId === a.alert_id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                      >
                        <Bell size={13} aria-hidden="true" />
                        {remindingId === a.alert_id ? "กำลังส่ง…" : "เตือนซ้ำ"}
                        {a.remind_count > 0 && (
                          <span className="px-1.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                            {a.remind_count}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openResolveModal(a)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      >
                        <CheckCircle2 size={13} aria-hidden="true" />
                        จัดการแล้ว
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-xs font-medium border-b border-slate-200/80">
                <th className="px-5 py-3.5">ทะเบียนรถ / ผู้รับผิดชอบ</th>
                <th className="px-4 py-3.5">ประเภทการบำรุงรักษา</th>
                <th className="px-4 py-3.5 text-right">ไมล์ล่าสุด / ปัจจุบัน</th>
                <th className="px-4 py-3.5 text-right">กำหนดรอบถัดไป</th>
                <th className="px-4 py-3.5 text-center">สถานะ</th>
                <th className="px-5 py-3.5 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading &&
                [1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-5 py-4">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))}
              {!loading && displayedAlerts.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    ไม่พบรายการในหมวดหมู่นี้
                  </td>
                </tr>
              )}
              {!loading &&
                displayedAlerts.map((a) => {
                  const current = a.vehicle?.current_mileage || 0;
                  const next = a.next_service_mileage || 0;
                  const diff = next - current;
                  return (
                    <tr
                      key={a.alert_id}
                      className={clsx(
                        "hover:bg-slate-50/70 transition-colors",
                        a.status === "OVERDUE" && "bg-red-50/25",
                        a.status === "DONE" && "opacity-65",
                      )}
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {a.vehicle?.license_plate}
                        </div>
                        <div className="text-xs text-slate-500">
                          {a.vehicle?.driver?.full_name || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                        {alertTypeMap[a.alert_type] || a.alert_type}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {current.toLocaleString("th-TH")} กม.
                        </div>
                        <div className="text-xs text-slate-400">
                          รอบก่อน {(a.last_service_mileage || 0).toLocaleString("th-TH")}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap">
                        <div
                          className={clsx(
                            "font-semibold",
                            a.status === "OVERDUE" ? "text-red-600" : "text-slate-900",
                          )}
                        >
                          {next.toLocaleString("th-TH")} กม.
                        </div>
                        {a.status !== "DONE" && (
                          <div
                            className={clsx(
                              "text-xs font-medium mt-0.5",
                              diff <= 0 ? "text-red-600" : "text-amber-700",
                            )}
                          >
                            {diff <= 0
                              ? `เกิน ${Math.abs(diff).toLocaleString("th-TH")} กม.`
                              : `เหลือ ${diff.toLocaleString("th-TH")} กม.`}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge status={a.status} type="alert" />
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {a.status !== "DONE" ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRemindDriver(a)}
                              disabled={remindingId === a.alert_id}
                              className={clsx(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                                a.remind_count > 0
                                  ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                                remindingId === a.alert_id && "opacity-50 cursor-not-allowed",
                              )}
                            >
                              <Bell size={13} aria-hidden="true" />
                              <span>{remindingId === a.alert_id ? "กำลังส่ง…" : "เตือนซ้ำ"}</span>
                              {a.remind_count > 0 && (
                                <span className="px-1.5 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-semibold tabular-nums">
                                  {a.remind_count}
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => openResolveModal(a)}
                              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                            >
                              <CheckCircle2 size={13} aria-hidden="true" />
                              จัดการแล้ว
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">ปิดรายการแล้ว</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolve Confirmation Modal */}
      {resolveModalAlert && (
        <Modal
          title="บันทึกดำเนินการบำรุงรักษาแล้ว"
          onClose={() => setResolveModalAlert(null)}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">ทะเบียนรถ</span>
                <span className="font-semibold text-slate-900">
                  {resolveModalAlert.vehicle?.license_plate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">รายการ</span>
                <span className="font-semibold text-[#8A1ABA]">
                  {alertTypeMap[resolveModalAlert.alert_type] || resolveModalAlert.alert_type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">กำหนดรอบเดิม</span>
                <span className="font-medium text-slate-700 tabular-nums">
                  {(resolveModalAlert.next_service_mileage || 0).toLocaleString("th-TH")} กม.
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="resolve-mileage"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                เลขไมล์ที่ดำเนินการเสร็จสิ้น (กม.) *
              </label>
              <input
                id="resolve-mileage"
                type="number"
                value={serviceMileageInput}
                onChange={(e) => setServiceMileageInput(e.target.value)}
                placeholder="เช่น 15950…"
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
              />
              <p className="text-xs text-slate-400 mt-1">
                เลขไมล์นี้จะถูกบันทึกในประวัติและใช้คำนวณรอบบำรุงรักษาครั้งถัดไป
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={resolving}
                onClick={() => setResolveModalAlert(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={resolving}
                onClick={handleConfirmResolve}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
              >
                <CheckCircle2 size={15} aria-hidden="true" />
                {resolving ? "กำลังบันทึก…" : "ยืนยันปิดแจ้งเตือน"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
