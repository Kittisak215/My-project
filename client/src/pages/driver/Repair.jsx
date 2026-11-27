import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import clsx from "clsx";
import { Wrench, Car, ShieldAlert, UploadCloud } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import useAuthStore from "../../store/authStore";
import { formatPhone } from "../../utils/format";

const todayDate = new Date();

export default function DriverRepairPage() {
  const { user } = useAuthStore();
  const [vehicles, setVehicles] = useState([]);
  const [garages, setGarages] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: { repairType: "GENERAL", repairStartDate: todayDate },
  });

  useEffect(() => {
    if (selectedVehicle) {
      const mileage = selectedVehicle.current_mileage || selectedVehicle.currentMileage || 0;
      setValue("mileageAtRepair", mileage);
    }
  }, [selectedVehicle, setValue]);

  useEffect(() => {
    const driverId = user?.driver_id || user?.driver?.driver_id;
    Promise.all([
      api.get("/vehicles", { params: { limit: 100, is_active: "true" } }),
      api.get("/garages", { params: { limit: 100, is_active: "true" } }),
    ]).then(([vRes, gRes]) => {
      const driverVehicles = (vRes.data.data || []).filter((v) => (v.driver_id || v.driverId) == driverId);
      setVehicles(driverVehicles);
      if (driverVehicles.length > 0) setSelectedVehicle(driverVehicles[0]);
      setGarages(gRes.data?.data || []);
    });
  }, [user?.driver_id, user?.driver?.driver_id]);

  const handleVehicleChange = (vehicleId) => {
    const v = vehicles.find((item) => (item.vehicle_id || item.id) === parseInt(vehicleId));
    if (v) setSelectedVehicle(v);
  };

  const onSubmit = async (data) => {
    if (!selectedVehicle) return toast.error("ไม่มียานพาหนะที่ได้รับมอบหมาย");
    const currentMileage = selectedVehicle.current_mileage || selectedVehicle.currentMileage || 0;
    if (data.mileageAtRepair && parseInt(data.mileageAtRepair) < currentMileage) {
      return toast.error(
        `เลขไมล์ขณะเข้าซ่อมต้องไม่น้อยกว่าเลขไมล์ปัจจุบัน (${currentMileage.toLocaleString("th-TH")} กม.)`,
      );
    }
    if (
      data.repairStartDate &&
      data.estimatedEndDate &&
      new Date(data.estimatedEndDate) < new Date(data.repairStartDate)
    ) {
      return toast.error("วันที่คาดว่าจะเสร็จต้องไม่เกิดขึ้นก่อนวันที่เข้าซ่อม");
    }

    setSubmitting(true);
    try {
      const repairData = {
        vehicle_id: selectedVehicle.vehicle_id || selectedVehicle.id,
        repair_type: data.repairType,
        issue_description: data.description,
        mileage_at_repair: data.mileageAtRepair ? parseInt(data.mileageAtRepair) : currentMileage,
        ...(data.garageId ? { garage_id: parseInt(data.garageId) } : {}),
        ...(data.estimatedCost ? { estimated_cost: parseFloat(data.estimatedCost) } : {}),
        ...(data.repairStartDate ? { repair_start_date: data.repairStartDate } : {}),
        ...(data.estimatedEndDate ? { estimated_end_date: data.estimatedEndDate } : {}),
      };

      if (data.repairType === "EMERGENCY") repairData.status = "AWAITING_APPROVAL";

      if (repairData.repair_start_date instanceof Date) {
        repairData.repair_start_date = repairData.repair_start_date.toISOString().slice(0, 10);
      }
      if (repairData.estimated_end_date instanceof Date) {
        repairData.estimated_end_date = repairData.estimated_end_date.toISOString().slice(0, 10);
      }

      const res = await api.post("/repairs", repairData);

      if (file && (res.data.request_id || res.data.id)) {
        const fd = new FormData();
        fd.append("receipt", file);
        await api.post(`/repairs/${res.data.request_id || res.data.id}/receipt`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      toast.success("ส่งคำร้องแจ้งซ่อมเรียบร้อยแล้ว");
      reset({ repairType: "GENERAL", repairStartDate: todayDate });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาดในการส่งคำขอ");
    } finally {
      setSubmitting(false);
    }
  };

  const repairType = watch("repairType");
  const watchRepairStartDate = watch("repairStartDate");
  const isEmergency = repairType === "EMERGENCY";
  const currentMileage = selectedVehicle
    ? selectedVehicle.current_mileage || selectedVehicle.currentMileage || 0
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            แจ้งซ่อม / เบิกฉุกเฉิน
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            ส่งคำขอเข้าซ่อมบำรุง หรือแจ้งเบิกเงินสำรองจ่ายกรณีฉุกเฉิน
          </p>
        </div>

        {vehicles.length > 1 && (
          <div className="sm:w-64">
            <label htmlFor="repair-vehicle" className="sr-only">
              เลือกรถที่ต้องการแจ้งซ่อม
            </label>
            <select
              id="repair-vehicle"
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
          {/* Selected Vehicle Banner */}
          <div className="bg-gradient-to-r from-[#6D1396] via-[#570F78] to-[#3E0957] text-white rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-purple-200/70">ยานพาหนะที่แจ้งซ่อม</p>
              <h2 className="text-xl font-bold mt-0.5">
                {selectedVehicle.license_plate}{" "}
                <span className="text-sm font-normal text-purple-200/80">
                  ({selectedVehicle.brand} {selectedVehicle.model})
                </span>
              </h2>
            </div>
            <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
              <p className="text-xs text-purple-200/70">เลขไมล์ปัจจุบัน</p>
              <p className="text-2xl font-bold tabular-nums">
                {currentMileage.toLocaleString("th-TH")}{" "}
                <span className="text-xs font-normal text-purple-200/80">กม.</span>
              </p>
            </div>
          </div>

          <section className="bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Repair Type */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">ประเภทการแจ้งซ่อม *</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      value: "GENERAL",
                      label: "ซ่อมทั่วไป",
                      desc: "ซ่อมบำรุงตามรอบ หรืออาการผิดปกติทั่วไป",
                      icon: Wrench,
                    },
                    {
                      value: "EMERGENCY",
                      label: "ซ่อมฉุกเฉิน / สำรองจ่าย",
                      desc: "รถเสียระหว่างทาง หรือขอเบิกย้อนหลัง",
                      icon: ShieldAlert,
                    },
                  ].map(({ value, label, desc, icon: Icon }) => {
                    const active = repairType === value;
                    return (
                      <label
                        key={value}
                        className={clsx(
                          "cursor-pointer border rounded-xl p-4 flex items-start gap-3 transition-colors",
                          active
                            ? value === "GENERAL"
                              ? "border-[#8A1ABA] bg-purple-50/60 ring-1 ring-[#8A1ABA]"
                              : "border-red-600 bg-red-50/60 ring-1 ring-red-600"
                            : "border-slate-200 hover:bg-slate-50",
                        )}
                      >
                        <input
                          {...register("repairType")}
                          type="radio"
                          value={value}
                          className="sr-only"
                        />
                        <Icon
                          size={18}
                          className={clsx(
                            "shrink-0 mt-0.5",
                            active
                              ? value === "GENERAL"
                                ? "text-[#8A1ABA]"
                                : "text-red-600"
                              : "text-slate-400",
                          )}
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="dr-desc" className="block text-sm font-medium text-slate-700 mb-1.5">
                  อาการและรายละเอียดปัญหา *
                </label>
                <textarea
                  id="dr-desc"
                  {...register("description", { required: "กรุณาระบุรายละเอียดปัญหา" })}
                  rows={3}
                  placeholder="อธิบายอาการที่พบ เช่น ช่วงล่างมีเสียงดัง, ไฟเตือนขึ้นหน้าปัด…"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                />
                {errors.description && (
                  <p className="text-red-600 text-xs mt-1">{errors.description.message}</p>
                )}
              </div>

              {/* Mileage */}
              <div>
                <label htmlFor="dr-mileage" className="block text-sm font-medium text-slate-700 mb-1.5">
                  เลขไมล์ขณะเข้าซ่อม (กม.)
                </label>
                <input
                  id="dr-mileage"
                  {...register("mileageAtRepair", {
                    validate: (v) => {
                      if (v === "" || v === undefined || v === null) return true;
                      const num = Number(v);
                      if (isNaN(num) || num < 0) return "เลขไมล์ต้องไม่ติดลบ";
                      if (currentMileage > 0 && num < currentMileage) {
                        return `ต้องไม่น้อยกว่าเลขไมล์ปัจจุบัน (${currentMileage.toLocaleString("th-TH")} กม.)`;
                      }
                      return true;
                    },
                  })}
                  type="number"
                  min={currentMileage || 0}
                  defaultValue={currentMileage}
                  onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                />
                {errors.mileageAtRepair && (
                  <p className="text-red-600 text-xs mt-1">{errors.mileageAtRepair.message}</p>
                )}
              </div>

              {/* Optional Repair Info */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-4">
                <p className="text-xs font-semibold text-slate-700">
                  ข้อมูลอู่และประมาณการ (ไม่บังคับ)
                </p>

                <div>
                  <label htmlFor="dr-garage" className="block text-xs font-medium text-slate-600 mb-1">
                    อู่ที่เข้าซ่อม
                  </label>
                  <select
                    id="dr-garage"
                    {...register("garageId")}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                  >
                    <option value="">อู่นอก / อื่นๆ (ดูจากใบเสร็จ)</option>
                    {garages.map((g) => (
                      <option key={g.garage_id} value={g.garage_id}>
                        {g.garage_name}
                        {g.phone ? ` (${formatPhone(g.phone)})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="dr-cost" className="block text-xs font-medium text-slate-600 mb-1">
                      ราคาประเมิน (บาท)
                    </label>
                    <input
                      id="dr-cost"
                      {...register("estimatedCost", {
                        valueAsNumber: true,
                        min: { value: 0, message: "ต้องไม่ติดลบ" },
                      })}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">วันที่เข้าซ่อม</label>
                    <Controller
                      name="repairStartDate"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          selected={field.value}
                          onChange={(date) => field.onChange(date)}
                          dateFormat="dd/MM/yyyy"
                          placeholderText="วว/ดด/ปปปป"
                          className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                          wrapperClassName="w-full"
                        />
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">คาดว่าจะเสร็จ</label>
                    <Controller
                      name="estimatedEndDate"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          selected={field.value}
                          onChange={(date) => field.onChange(date)}
                          minDate={watchRepairStartDate || undefined}
                          dateFormat="dd/MM/yyyy"
                          placeholderText="วว/ดด/ปปปป"
                          className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                          wrapperClassName="w-full"
                        />
                      )}
                    />
                  </div>
                </div>
              </div>

              {isEmergency && (
                <div className="bg-red-50 border border-red-200/80 rounded-xl p-4 text-xs text-red-700">
                  <p className="font-semibold text-red-900 mb-0.5">คำขอเบิกเงินสำรองจ่ายฉุกเฉิน</p>
                  <p>รายการนี้จะถูกส่งขออนุมัติงบประมาณโดยอัตโนมัติ กรุณาระบุยอดประเมินและแนบใบเสร็จรับเงิน</p>
                </div>
              )}

              {/* File Upload */}
              <div>
                <label htmlFor="dr-file" className="block text-sm font-medium text-slate-700 mb-1.5">
                  แนบรูปภาพความเสียหาย / ใบเสร็จรับเงิน
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-4 text-center bg-slate-50/50 transition-colors">
                  <UploadCloud size={26} className="mx-auto text-slate-400 mb-1.5" aria-hidden="true" />
                  <input
                    id="dr-file"
                    type="file"
                    ref={fileRef}
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">รองรับ JPG, PNG, PDF ไม่เกิน 5MB</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={clsx(
                  "w-full py-3 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer",
                  isEmergency ? "bg-red-600 hover:bg-red-700" : "bg-[#8A1ABA] hover:bg-[#73149c]",
                )}
              >
                {submitting
                  ? "กำลังส่งคำขอ…"
                  : isEmergency
                    ? "ส่งคำขอเบิกเงินฉุกเฉิน"
                    : "ยืนยันส่งคำร้องแจ้งซ่อม"}
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
