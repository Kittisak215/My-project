import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Wrench,
  Car,
  ShieldAlert,
  UploadCloud,
  MapPin,
  DollarSign,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import useAuthStore from "../../store/authStore";

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

  // Sync mileage when selected vehicle changes
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
      // eslint-disable-next-line eqeqeq
      const driverVehicles = vRes.data.data.filter(
        (v) => (v.driver_id || v.driverId) == driverId,
      );
      setVehicles(driverVehicles);
      if (driverVehicles.length > 0) setSelectedVehicle(driverVehicles[0]);
      setGarages(gRes.data?.data || []);
    });
  }, [user?.driver_id, user?.driver?.driver_id]);

  const handleVehicleChange = (vehicleId) => {
    const v = vehicles.find(
      (v) => (v.vehicle_id || v.id) === parseInt(vehicleId),
    );
    if (v) setSelectedVehicle(v);
  };

  const onSubmit = async (data) => {
    if (!selectedVehicle) return toast.error("ไม่มียานพาหนะที่ได้รับมอบหมาย");
    setSubmitting(true);
    try {
      const currentMileage =
        selectedVehicle.current_mileage || selectedVehicle.currentMileage || 0;
      const repairData = {
        vehicle_id: selectedVehicle.vehicle_id || selectedVehicle.id,
        repair_type: data.repairType,
        issue_description: data.description,
        mileage_at_repair: data.mileageAtRepair
          ? parseInt(data.mileageAtRepair)
          : currentMileage,
        ...(data.garageId ? { garage_id: parseInt(data.garageId) } : {}),
        ...(data.estimatedCost
          ? { estimated_cost: parseFloat(data.estimatedCost) }
          : {}),
        ...(data.repairStartDate
          ? { repair_start_date: data.repairStartDate }
          : {}),
        ...(data.estimatedEndDate
          ? { estimated_end_date: data.estimatedEndDate }
          : {}),
      };

      if (data.repairType === "EMERGENCY")
        repairData.status = "AWAITING_APPROVAL";

      // Convert Date objects to ISO string for API
      if (repairData.repair_start_date instanceof Date) {
        repairData.repair_start_date = repairData.repair_start_date
          .toISOString()
          .slice(0, 10);
      }
      if (repairData.estimated_end_date instanceof Date) {
        repairData.estimated_end_date = repairData.estimated_end_date
          .toISOString()
          .slice(0, 10);
      }

      const res = await api.post("/repairs", repairData);

      if (file && (res.data.request_id || res.data.id)) {
        const fd = new FormData();
        fd.append("receipt", file);
        await api.post(
          `/repairs/${res.data.request_id || res.data.id}/receipt`,
          fd,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
      }
      toast.success("ส่งคำร้องแจ้งซ่อมสำเร็จ!");
      reset();
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาดในการส่งคำขอ");
    }
    setSubmitting(false);
  };

  const repairType = watch("repairType");
  const isEmergency = repairType === "EMERGENCY";
  const currentMileage = selectedVehicle
    ? selectedVehicle.current_mileage || selectedVehicle.currentMileage || 0
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header & Vehicle Selector */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-100/80 shrink-0">
            <Wrench size={26} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              แจ้งซ่อม / เบิกฉุกเฉิน
            </h1>
            <p className="text-xs md:text-sm text-slate-500">
              ส่งคำขอเข้าซ่อมบำรุงหรือเบิกจ่ายเงินสำรองกรณีฉุกเฉิน
            </p>
          </div>
        </div>

        {vehicles.length > 1 && (
          <div className="pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                เลือกรถที่ต้องการแจ้งซ่อม
            </label>
            <div className="relative">
                <select
                  value={selectedVehicle?.vehicle_id || selectedVehicle?.id || ""}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 font-bold text-sm md:text-base rounded-xl px-4 py-3.5 pr-10 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all cursor-pointer"
                >
                  {vehicles.map((v) => (
                    <option key={v.vehicle_id || v.id} value={v.vehicle_id || v.id}>
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
      </div>

      {!selectedVehicle ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200 shadow-xs">
          <Car size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-600">
            ยังไม่มียานพาหนะที่ได้รับมอบหมาย
          </p>
          <p className="text-xs text-slate-400 mt-1">
            กรุณาติดต่อผู้ดูแลระบบ (Admin) เพื่อมอบหมายรถ
          </p>
        </div>
      ) : (
        <>
          {/* Vehicle Summary Card */}
          <div 
              className="text-white rounded-2xl p-5 md:p-6 relative overflow-hidden"
              style={{
                  background: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #3b0764 100%)',
                  boxShadow: '0 10px 30px -10px rgba(124,58,237,0.4)'
              }}
          >
              {/* Ambient glow blobs */}
              <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20"
                  style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.8), transparent 70%)' }} />
              <div className="pointer-events-none absolute -bottom-16 -left-10 w-56 h-56 rounded-full opacity-20"
                  style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.6), transparent 70%)' }} />
                  
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md shrink-0 border border-white/10">
                  <Car size={24} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-white">
                      {selectedVehicle.license_plate}
                    </h2>
                    <span className="text-[11px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                      {selectedVehicle.brand} {selectedVehicle.model}
                    </span>
                  </div>
                  <p className="text-xs text-violet-200 mt-0.5 font-medium">
                    สถานะ:{" "}
                    {selectedVehicle.status === "READY"
                      ? "🟢 พร้อมใช้งาน"
                      : "🛠️ กำลังซ่อมบำรุง"}
                  </p>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2.5 border border-white/15 self-start sm:self-auto min-w-[170px] text-left sm:text-right">
                <p className="text-xs text-violet-200 font-medium">เลขไมล์ปัจจุบัน</p>
                <p className="text-lg font-extrabold text-white">
                  {currentMileage.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-violet-200">
                    กม.
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 md:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Repair Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  ประเภทการแจ้งซ่อม *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      value: "GENERAL",
                      icon: "🔧",
                      label: "ซ่อมทั่วไป",
                      desc: "ซ่อมบำรุงประจำ หรืออาการผิดปกติทั่วไปที่พบระหว่างใช้งาน",
                    },
                    {
                      value: "EMERGENCY",
                      icon: "🚨",
                      label: "ซ่อมฉุกเฉิน",
                      desc: "รถพังระหว่างเดินทาง / สำรองเงินจ่ายฉุกเฉินและขอเบิกย้อนหลัง",
                    },
                  ].map(({ value, icon, label, desc }) => (
                    <label
                      key={value}
                      className={`cursor-pointer border-2 rounded-2xl p-4 transition-all relative flex items-start gap-3.5 ${
                        repairType === value
                          ? value === "GENERAL"
                            ? "border-[#8A1ABA] bg-purple-50/60 shadow-xs ring-2 ring-purple-100"
                            : "border-red-600 bg-red-50/50 shadow-xs ring-2 ring-red-100"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <input
                        {...register("repairType")}
                        type="radio"
                        value={value}
                        className="sr-only"
                      />
                      <span className="text-2xl shrink-0 mt-0.5">{icon}</span>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-bold ${
                            repairType === value
                              ? value === "GENERAL"
                                ? "text-[#8A1ABA]"
                                : "text-red-900"
                              : "text-slate-800"
                          }`}
                        >
                          {label}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                          {desc}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Problem Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  อาการและรายละเอียดปัญหาที่พบ *
                </label>
                <textarea
                  {...register("description", {
                    required: "กรุณาระบุรายละเอียดปัญหาหรืออาการผิดปกติ",
                  })}
                  rows={4}
                  placeholder="อธิบายอาการ เช่น มีเสียงดังผิดปกติช่วงล่างด้านขวา, ไฟเครื่องยนต์โชว์เตือน, ยางหน้าซ้ายรั่ว..."
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none bg-white"
                />
                {errors.description && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Mileage at Repair */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  เลขไมล์ขณะเข้าซ่อม (กม.)
                </label>
                <input
                  {...register("mileageAtRepair", {
                    min: { value: 0, message: "เลขไมล์ต้องไม่ติดลบ" },
                  })}
                  type="number"
                  defaultValue={currentMileage}
                  placeholder={`ไมล์ปัจจุบัน ${currentMileage.toLocaleString()} กม.`}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8A1ABA]/20 focus:border-[#8A1ABA] bg-white"
                />
                <p className="text-xs text-slate-400 mt-1">
                  ระบุเลขไมล์จากหน้าปัดรถ ณ วันที่นำเข้าซ่อม
                </p>
              </div>

              {/* Garage & Cost Info */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                  <MapPin size={16} className="text-[#8A1ABA]" />
                  <span>ข้อมูลการซ่อม</span>
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    (ไม่บังคับ)
                  </span>
                </div>

                {/* Garage */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    อู่ที่เข้าซ่อม
                  </label>
                  <select
                    {...register("garageId")}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8A1ABA]/20 focus:border-[#8A1ABA]"
                  >
                    <option value="">
                      -- อู่นอก / อื่นๆ (ดูจากใบเสร็จหรือระบุในรายละเอียด) --
                    </option>
                    {garages.map((g) => (
                      <option key={g.garage_id} value={g.garage_id}>
                        {g.garage_name}
                        {g.phone ? ` (${g.phone})` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    💡 หากเข้าซ่อมอู่นอก/ข้างทางฉุกเฉิน ให้เลือกตัวเลือกนี้
                    แล้วแนบรูปใบเสร็จรับเงินด้านล่าง
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Estimated Cost */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      <DollarSign size={12} className="inline mr-1" />
                      ราคาประเมิน (บาท)
                    </label>
                    <input
                      {...register("estimatedCost", { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8A1ABA]/20 focus:border-[#8A1ABA]"
                    />
                  </div>

                  {/* Repair Start Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      วันที่เข้าซ่อม
                    </label>
                    <Controller
                      name="repairStartDate"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          selected={field.value}
                          onChange={(date) => field.onChange(date)}
                          dateFormat="dd/MM/yyyy"
                          placeholderText="เลือกวันที่..."
                          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#8A1ABA]/20 focus:border-[#8A1ABA]"
                          wrapperClassName="w-full"
                          calendarClassName="shadow-xl rounded-xl border-0"
                          showPopperArrow={false}
                        />
                      )}
                    />
                  </div>

                  {/* Estimated End Date */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      วันที่คาดว่าจะเสร็จ (นัดรับรถ)
                    </label>
                    <Controller
                      name="estimatedEndDate"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          selected={field.value}
                          onChange={(date) => field.onChange(date)}
                          dateFormat="dd/MM/yyyy"
                          placeholderText="เลือกวันที่..."
                          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#8A1ABA]/20 focus:border-[#8A1ABA]"
                          wrapperClassName="w-full"
                          calendarClassName="shadow-xl rounded-xl border-0"
                          showPopperArrow={false}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Emergency note */}
              {isEmergency && (
                <div className="bg-red-50/80 border border-red-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-red-800 font-bold text-sm mb-1">
                    <ShieldAlert size={18} className="text-red-600 shrink-0" />
                    <span>คำขอเบิกเงินสำรองจ่ายฉุกเฉิน</span>
                  </div>
                  <p className="text-xs text-red-600">
                    รายการนี้จะถูกส่งไปให้ผู้บริหารตรวจสอบและอนุมัติยอดเงินโดยอัตโนมัติ
                    กรุณาระบุราคาประเมิน/ค่าใช้จ่ายในช่องด้านบน
                  </p>
                </div>
              )}

              {/* File Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  แนบรูปภาพความเสียหาย / ใบเสร็จรับเงิน
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl p-5 text-center bg-slate-50/50 transition-colors">
                  <UploadCloud
                    size={30}
                    className="mx-auto text-slate-400 mb-1.5"
                  />
                  <input
                    type="file"
                    ref={fileRef}
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    รองรับไฟล์ JPG, PNG, PDF ขนาดไม่เกิน 5MB
                  </p>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-4 rounded-xl text-white text-sm font-bold transition-all shadow-sm hover:shadow-md disabled:opacity-60 cursor-pointer ${
                  isEmergency
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#8A1ABA] hover:bg-[#72159c]"
                }`}
              >
                {submitting
                  ? "กำลังส่งคำขอ..."
                  : isEmergency
                    ? "🚨 ส่งคำขอเบิกเงินฉุกเฉิน"
                    : "🔧 ยืนยันส่งคำร้องแจ้งซ่อม"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
