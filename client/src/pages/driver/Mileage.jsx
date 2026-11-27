import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  Car,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Wrench,
  ArrowRight,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import useAuthStore from "../../store/authStore";
import Modal from "../../components/Modal";

const todayDate = new Date();

const typeLabelMap = {
  OIL_CHANGE: "เปลี่ยนถ่ายน้ำมันเครื่อง",
  TIRE_CHANGE: "เปลี่ยนยาง",
};

export default function MileagePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleForecasts, setVehicleForecasts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [postSubmitModal, setPostSubmitModal] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: { recordDate: todayDate },
  });

  const fetchForecast = async (vid) => {
    try {
      const res = await api.get("/alerts/forecast", { params: { vehicle_id: vid } });
      if (Array.isArray(res.data)) {
        const target =
          res.data.find((item) => item.vehicle?.vehicle_id === vid) || res.data[0];
        setVehicleForecasts(target?.forecasts || []);
      }
    } catch {
      /* silent */
    }
  };

  const fetchLogs = async (vid) => {
    try {
      const res = await api.get(`/mileage/${vid}`);
      setLogs(res.data || []);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    const driverId = user?.driver_id || user?.driver?.driver_id;
    api.get("/vehicles", { params: { limit: 100, is_active: "true" } }).then((res) => {
      const driverVehicles = (res.data.data || []).filter(
        (v) => (v.driver_id || v.driverId) === driverId,
      );
      setVehicles(driverVehicles);
      if (driverVehicles.length > 0) {
        const initialV = driverVehicles[0];
        const vid = initialV.vehicle_id || initialV.id;
        setSelectedVehicle(initialV);
        fetchLogs(vid);
        fetchForecast(vid);
      }
    });
  }, [user?.driver_id, user?.driver?.driver_id]);

  const handleVehicleChange = (vehicleId) => {
    const v = vehicles.find((item) => (item.vehicle_id || item.id) === parseInt(vehicleId));
    if (v) {
      const vid = v.vehicle_id || v.id;
      setSelectedVehicle(v);
      fetchLogs(vid);
      fetchForecast(vid);
      reset({ recordDate: todayDate, mileage: "" });
    }
  };

  const currentMileage =
    logs.length > 0
      ? logs[0].mileage_end
      : selectedVehicle
        ? selectedVehicle.current_mileage || selectedVehicle.currentMileage || 0
        : 0;

  const watchedMileage = watch("mileage");
  const enteredMileage =
    watchedMileage && !isNaN(parseInt(watchedMileage)) ? parseInt(watchedMileage) : null;
  const isMileageValid = enteredMileage !== null && enteredMileage >= currentMileage;
  const calculatedDistance = isMileageValid ? enteredMileage - currentMileage : 0;

  const liveMaintenanceAlerts =
    isMileageValid && vehicleForecasts.length > 0
      ? vehicleForecasts.map((f) => {
          const remaining = f.next_service_mileage - enteredMileage;
          return {
            ...f,
            remaining,
            isOverdue: remaining <= 0,
            isWarning: remaining > 0 && remaining <= 1000,
          };
        })
      : [];

  const hasOverdue = liveMaintenanceAlerts.some((a) => a.isOverdue);
  const hasWarning = liveMaintenanceAlerts.some((a) => a.isWarning);
  const criticalAlerts = liveMaintenanceAlerts.filter((a) => a.isOverdue || a.isWarning);

  const onFormError = (formErrors) => {
    const firstErr = Object.values(formErrors)[0]?.message;
    if (firstErr) toast.error(firstErr);
  };

  const onSubmit = async (data) => {
    if (!selectedVehicle) {
      toast.error("ไม่พบข้อมูลยานพาหนะที่เลือก");
      return;
    }
    setSubmitting(true);
    try {
      const d = data.recordDate instanceof Date ? data.recordDate : new Date(data.recordDate);
      const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      const res = await api.post("/mileage", {
        vehicle_id: selectedVehicle.vehicle_id || selectedVehicle.id,
        record_date: localDate,
        mileage_end: parseInt(data.mileage),
        recorded_by: user?.driver_id || selectedVehicle?.driver_id,
      });

      const hasServerWarnings =
        res.data.maintenanceWarnings && res.data.maintenanceWarnings.length > 0;
      const hasTriggered = res.data.triggeredAlerts && res.data.triggeredAlerts.length > 0;

      if (hasServerWarnings || hasTriggered || criticalAlerts.length > 0) {
        const warnings = hasServerWarnings
          ? res.data.maintenanceWarnings
          : criticalAlerts.map((a) => ({
              type: a.type,
              next_service_mileage: a.next_service_mileage,
              remaining_mileage: a.remaining,
              is_overdue: a.isOverdue,
              overdue_by: a.isOverdue ? Math.abs(a.remaining) : 0,
            }));

        const isAnyOverdue = warnings.some((w) => w.is_overdue);
        setPostSubmitModal({
          show: true,
          hasOverdue: isAnyOverdue,
          warnings,
          savedMileage: parseInt(data.mileage),
        });
        toast.warn(
          isAnyOverdue
            ? "บันทึกแล้ว แต่มีรายการบำรุงรักษาที่เลยกำหนด"
            : "บันทึกแล้ว มีรายการใกล้ถึงรอบบำรุงรักษา",
          { autoClose: 4500 },
        );
      } else {
        toast.success("บันทึกระยะทางเรียบร้อยแล้ว");
      }

      reset({ recordDate: todayDate, mileage: "" });
      const vid = selectedVehicle.vehicle_id || selectedVehicle.id;
      fetchLogs(vid);
      fetchForecast(vid);
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            บันทึกระยะทางสะสม
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            อัปเดตเลขไมล์เพื่อคำนวณรอบเปลี่ยนถ่ายน้ำมันเครื่องและเปลี่ยนยางอัตโนมัติ
          </p>
        </div>
        {vehicles.length > 1 && (
          <div className="sm:w-64">
            <label htmlFor="mileage-vehicle" className="sr-only">
              เลือกรถที่ต้องการบันทึก
            </label>
            <select
              id="mileage-vehicle"
              value={selectedVehicle?.vehicle_id || selectedVehicle?.id || ""}
              onChange={(e) => handleVehicleChange(e.target.value)}
              className="w-full bg-white border border-slate-200/90 text-slate-800 font-medium text-sm rounded-xl px-3.5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] cursor-pointer"
            >
              {vehicles.map((v) => (
                <option key={v.vehicle_id || v.id} value={v.vehicle_id || v.id}>
                  {v.license_plate} ({v.brand} {v.model})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!selectedVehicle ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/90">
          <Car size={38} className="mx-auto mb-2 text-slate-300" aria-hidden="true" />
          <p className="font-semibold text-slate-700 text-sm">ยังไม่มียานพาหนะที่ได้รับมอบหมาย</p>
          <p className="text-xs text-slate-400 mt-1">กรุณาติดต่อผู้ดูแลระบบ (Admin)</p>
        </div>
      ) : (
        <>
          {/* Vehicle Summary Strip */}
          <div className="bg-gradient-to-r from-[#6D1396] via-[#570F78] to-[#3E0957] text-white rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-purple-200/70">ยานพาหนะที่เลือก</p>
              <h2 className="text-xl font-bold mt-0.5">
                {selectedVehicle.license_plate}{" "}
                <span className="text-sm font-normal text-purple-200/80">
                  ({selectedVehicle.brand} {selectedVehicle.model})
                </span>
              </h2>
            </div>
            <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
              <p className="text-xs text-purple-200/70">เลขไมล์ล่าสุด</p>
              <p className="text-2xl font-bold tabular-nums">
                {currentMileage.toLocaleString("th-TH")}{" "}
                <span className="text-xs font-normal text-purple-200/80">กม.</span>
              </p>
            </div>
          </div>

          {/* Form Card */}
          <section className="bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-5 pb-3 border-b border-slate-100">
              บันทึกเลขไมล์ใหม่
            </h2>

            <form onSubmit={handleSubmit(onSubmit, onFormError)} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    วันที่บันทึก *
                  </label>
                  <Controller
                    name="recordDate"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <DatePicker
                        selected={field.value}
                        onChange={(date) => field.onChange(date)}
                        maxDate={todayDate}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="เลือกวันที่…"
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                        wrapperClassName="w-full"
                      />
                    )}
                  />
                </div>

                <div>
                  <label htmlFor="m-input" className="block text-sm font-medium text-slate-700 mb-1.5">
                    เลขไมล์ปัจจุบัน (กม.) *
                  </label>
                  <input
                    id="m-input"
                    {...register("mileage", {
                      required: "กรุณากรอกเลขไมล์",
                      min: {
                        value: currentMileage,
                        message: `ต้องไม่น้อยกว่า ${currentMileage.toLocaleString("th-TH")} กม.`,
                      },
                    })}
                    type="number"
                    min={currentMileage}
                    step="1"
                    onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                    placeholder={`ขั้นต่ำ ${currentMileage.toLocaleString("th-TH")} กม.…`}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                  />
                  {errors.mileage && (
                    <p className="text-red-600 text-xs mt-1">{errors.mileage.message}</p>
                  )}
                </div>
              </div>

              {isMileageValid && (
                <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" aria-hidden="true" />
                    <span className="text-xs text-emerald-900">ระยะทางที่วิ่งเพิ่มตั้งแต่ครั้งก่อน</span>
                  </div>
                  <span className="text-base font-bold text-emerald-700 tabular-nums">
                    +{calculatedDistance.toLocaleString("th-TH")} กม.
                  </span>
                </div>
              )}

              {isMileageValid && vehicleForecasts.length > 0 && (hasOverdue || hasWarning) && (
                <div
                  className={
                    hasOverdue
                      ? "bg-red-50 border border-red-200 rounded-xl p-4 space-y-2.5"
                      : "bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2.5"
                  }
                >
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    {hasOverdue ? (
                      <>
                        <AlertCircle size={18} className="text-red-600" aria-hidden="true" />
                        <span className="text-red-900">เลยกำหนดรอบบำรุงรักษาแล้ว</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={18} className="text-amber-600" aria-hidden="true" />
                        <span className="text-amber-900">ใกล้ถึงรอบบำรุงรักษา (เหลือน้อยกว่า 1,000 กม.)</span>
                      </>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {criticalAlerts.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-lg px-3 py-2 border border-slate-200/70 flex items-center justify-between text-xs tabular-nums"
                      >
                        <span className="font-medium text-slate-800">
                          {typeLabelMap[item.type] || item.type} (รอบ {item.next_service_mileage.toLocaleString("th-TH")})
                        </span>
                        <span className={item.isOverdue ? "font-semibold text-red-600" : "font-semibold text-amber-700"}>
                          {item.isOverdue
                            ? `เกิน ${Math.abs(item.remaining).toLocaleString("th-TH")} กม.`
                            : `เหลือ ${item.remaining.toLocaleString("th-TH")} กม.`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 flex items-start gap-2.5 text-slate-500 text-xs">
                <Info size={16} className="text-[#8A1ABA] shrink-0 mt-0.5" aria-hidden="true" />
                <p>ตรวจสอบเลขไมล์จากหน้าปัดรถจริงก่อนบันทึก ระบบจะนำไปคำนวณรอบบำรุงรักษาโดยอัตโนมัติ</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#8A1ABA] hover:bg-[#73149c] text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer"
              >
                {submitting ? "กำลังบันทึก…" : "บันทึกระยะทางสะสม"}
              </button>
            </form>
          </section>

          {/* History Table */}
          {logs.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 text-base">ประวัติการบันทึกย้อนหลัง</h3>
                <span className="text-xs text-slate-500 tabular-nums">{logs.length} รายการล่าสุด</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 text-xs font-medium border-b border-slate-200/80">
                      <th className="px-5 py-3">วันที่บันทึก</th>
                      <th className="px-4 py-3 text-right">ไมล์ก่อนหน้า</th>
                      <th className="px-4 py-3 text-right">ไมล์ที่บันทึก</th>
                      <th className="px-5 py-3 text-right">ระยะทางเพิ่ม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 tabular-nums">
                    {logs.map((l) => (
                      <tr key={l.mileage_id || l.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          {formatDate(l.record_date)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-500">
                          {(l.mileage_start || 0).toLocaleString("th-TH")}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                          {(l.mileage_end || 0).toLocaleString("th-TH")}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-emerald-700">
                          +{(l.distance_km || 0).toLocaleString("th-TH")} กม.
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {postSubmitModal && (
        <Modal
          title={
            postSubmitModal.hasOverdue
              ? "เลยกำหนดรอบบำรุงรักษา"
              : "ใกล้ถึงรอบบำรุงรักษาแล้ว"
          }
          subtitle={`บันทึกเลขไมล์ ${postSubmitModal.savedMileage?.toLocaleString("th-TH")} กม. สำเร็จแล้ว`}
          onClose={() => setPostSubmitModal(null)}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
              {postSubmitModal.warnings?.map((w, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs tabular-nums">
                  <span className="font-medium text-slate-800 inline-flex items-center gap-1.5">
                    <Wrench size={14} className={w.is_overdue ? "text-red-600" : "text-amber-600"} aria-hidden="true" />
                    {typeLabelMap[w.type] || w.type}
                  </span>
                  <span className={w.is_overdue ? "font-semibold text-red-600" : "font-semibold text-amber-700"}>
                    {w.is_overdue
                      ? `เกิน ${(w.overdue_by || Math.abs(w.remaining_mileage)).toLocaleString("th-TH")} กม.`
                      : `เหลือ ${(w.remaining_mileage || 0).toLocaleString("th-TH")} กม.`}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPostSubmitModal(null)}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                รับทราบ
              </button>
              <button
                type="button"
                onClick={() => {
                  setPostSubmitModal(null);
                  navigate("/driver/repair");
                }}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-[#8A1ABA] hover:bg-[#73149c] inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                แจ้งซ่อมตอนนี้
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
