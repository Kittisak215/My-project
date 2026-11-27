import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Car, Gauge, User, Info } from "lucide-react";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import clsx from "clsx";
import Skeleton from "../../components/Skeleton";
import Modal from "../../components/Modal";

const VehicleStatusPill = ({ status, isActive }) => {
  if (isActive === false) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-100 text-slate-600 border-slate-200/80 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" aria-hidden="true" />
        ปลดระวาง
      </span>
    );
  }
  if (status === "IN_REPAIR") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200/80 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
        กำลังซ่อม
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200/80 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
      พร้อมใช้งาน
    </span>
  );
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();
  const limit = 10;

  const selectedTypeId = watch("type_id");
  const selectedTypeObj = vehicleTypes.find(
    (t) => t.type_id.toString() === selectedTypeId?.toString(),
  );

  const currentDefaults = selectedTypeObj
    ? {
        mineral: selectedTypeObj.oil_interval_mineral_km,
        semi: selectedTypeObj.oil_interval_semi_synthetic_km,
        fully: selectedTypeObj.oil_interval_fully_synthetic_km,
        tire: selectedTypeObj.tire_change_interval_km,
      }
    : { mineral: 5000, semi: 7000, fully: 10000, tire: 50000 };

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/vehicles", {
        params: { search, status, page, limit },
      });
      setVehicles(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error("โหลดข้อมูลยานพาหนะไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    api.get("/drivers", { params: { limit: 100 } }).then((res) => setDrivers(res.data.data || [])).catch(() => {});
    api.get("/vehicle-types").then((res) => setVehicleTypes(res.data || [])).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    reset({
      license_plate: "",
      type_id: "",
      brand: "",
      model: "",
      color: "",
      year: "",
      status: "READY",
      driver_id: "",
      is_active: "true",
    });
    setShowModal(true);
  };

  const openEdit = (v) => {
    setEditing(v);
    reset({
      license_plate: v.license_plate,
      type_id: v.type_id?.toString(),
      brand: v.brand,
      model: v.model,
      color: v.color,
      year: v.year,
      status: v.status,
      driver_id: v.driver_id ? v.driver_id.toString() : "",
      is_active: v.is_active !== false ? "true" : "false",
    });
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        license_plate: data.license_plate,
        type_id: parseInt(data.type_id),
        brand: data.brand,
        model: data.model,
        color: data.color,
        year: parseInt(data.year),
        status: data.status,
        driver_id: data.driver_id ? parseInt(data.driver_id) : null,
        is_active: data.is_active === "true",
      };
      if (editing) await api.put(`/vehicles/${editing.vehicle_id}`, payload);
      else await api.post("/vehicles", payload);
      toast.success(editing ? "บันทึกการแก้ไขแล้ว" : "เพิ่มยานพาหนะแล้ว");
      setShowModal(false);
      fetchVehicles();
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            จัดการยานพาหนะ
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            ทะเบียนรถทั้งหมดในระบบ พร้อมข้อมูลเลขไมล์และผู้รับผิดชอบ ({total.toLocaleString("th-TH")} คัน)
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#8A1ABA] hover:bg-[#73149c] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] focus-visible:ring-offset-2 cursor-pointer"
        >
          <Plus size={16} aria-hidden="true" />
          เพิ่มยานพาหนะ
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <label htmlFor="vehicle-search" className="sr-only">
            ค้นหาทะเบียนรถหรือยี่ห้อ
          </label>
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="vehicle-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value.trimStart());
              setPage(1);
            }}
            placeholder="ค้นหาทะเบียนรถ, ยี่ห้อ…"
            autoComplete="off"
            spellCheck={false}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] transition-colors"
          />
        </div>
        <div>
          <label htmlFor="vehicle-status-filter" className="sr-only">
            กรองตามสถานะ
          </label>
          <select
            id="vehicle-status-filter"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-44 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] transition-colors"
          >
            <option value="">สถานะทั้งหมด</option>
            <option value="READY">พร้อมใช้งาน</option>
            <option value="IN_REPAIR">กำลังซ่อม</option>
            <option value="INACTIVE">ปลดระวาง</option>
          </select>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading && (
          <>
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </>
        )}
        {!loading && vehicles.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/90 py-12 text-center text-slate-400 text-sm">
            ไม่พบข้อมูลยานพาหนะ
          </div>
        )}
        {!loading &&
          vehicles.map((v) => (
            <div
              key={v.vehicle_id}
              className={clsx(
                "bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3",
                !v.is_active && "opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 text-base">
                      {v.license_plate}
                    </p>
                    <VehicleStatusPill status={v.status} isActive={v.is_active} />
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {v.vehicleType?.type_name || "ไม่ระบุ"} • {v.brand} {v.model} ({v.color || "-"} / {v.year || "-"})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(v)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-[#8A1ABA] bg-slate-50 hover:bg-purple-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  แก้ไข
                </button>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <User size={13} aria-hidden="true" />
                  {v.driver?.full_name || "ไม่ระบุ"}
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-slate-700 tabular-nums">
                  <Gauge size={13} aria-hidden="true" />
                  {(v.current_mileage || 0).toLocaleString("th-TH")} กม.
                </span>
              </div>
            </div>
          ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-xs font-medium border-b border-slate-200/80">
                <th className="px-5 py-3.5">ป้ายทะเบียน</th>
                <th className="px-4 py-3.5">ประเภท / ยี่ห้อ</th>
                <th className="px-4 py-3.5">ผู้รับผิดชอบ</th>
                <th className="px-4 py-3.5 text-right">รอบน้ำมัน / ยาง</th>
                <th className="px-4 py-3.5 text-right">เลขไมล์ปัจจุบัน</th>
                <th className="px-4 py-3.5 text-center">สถานะ</th>
                <th className="px-5 py-3.5 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading &&
                [1, 2, 3, 4, 5].map((item) => (
                  <tr key={`sk-${item}`}>
                    <td colSpan={7} className="px-5 py-4">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))}
              {!loading && vehicles.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Car size={28} className="mx-auto mb-2 text-slate-300" aria-hidden="true" />
                    ไม่พบข้อมูลยานพาหนะ
                  </td>
                </tr>
              )}
              {!loading &&
                vehicles.map((v) => (
                  <tr
                    key={v.vehicle_id}
                    className={clsx(
                      "hover:bg-slate-50/70 transition-colors",
                      !v.is_active && "opacity-65",
                    )}
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{v.license_plate}</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">#{v.vehicle_id}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-slate-900 font-medium">
                        {v.brand} {v.model}
                      </div>
                      <div className="text-xs text-slate-500">
                        {v.vehicleType?.type_name || "ไม่ระบุ"} • สี{v.color || "-"} • ปี {v.year || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">
                      {v.driver?.full_name || <span className="text-slate-400">-</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs tabular-nums whitespace-nowrap">
                      <div className="text-slate-700">
                        น้ำมัน {v.currentOilInterval?.toLocaleString("th-TH") || "-"} กม.
                        {v.currentOilGradeLabel && (
                          <span className="text-slate-400 ml-1">({v.currentOilGradeLabel})</span>
                        )}
                      </div>
                      <div className="text-slate-400">
                        ยาง {v.vehicleType?.tire_change_interval_km?.toLocaleString("th-TH") || "-"} กม.
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {(v.current_mileage || 0).toLocaleString("th-TH")} กม.
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <VehicleStatusPill status={v.status} isActive={v.is_active} />
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(v)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-[#8A1ABA] bg-white hover:bg-purple-50 rounded-lg border border-slate-200 hover:border-purple-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] cursor-pointer"
                      >
                        แก้ไข
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span className="tabular-nums">
            แสดง {vehicles.length} จากทั้งหมด {total.toLocaleString("th-TH")} รายการ
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              ก่อนหน้า
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={clsx(
                  "px-3 py-1.5 border rounded-lg tabular-nums cursor-pointer transition-colors",
                  page === p
                    ? "bg-[#8A1ABA] border-[#8A1ABA] text-white font-semibold"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
                )}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Pagination */}
      {total > limit && (
        <div className="md:hidden flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="tabular-nums">ทั้งหมด {total} รายการ</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 disabled:opacity-40"
            >
              ก่อนหน้า
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 disabled:opacity-40"
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <Modal
          title={editing ? "แก้ไขยานพาหนะ" : "เพิ่มยานพาหนะ"}
          onClose={() => setShowModal(false)}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label htmlFor="v-plate" className="text-sm font-medium text-slate-700">
                    ป้ายทะเบียน *
                  </label>
                  <div className="group relative inline-block">
                    <span
                      className="cursor-help text-slate-400 hover:text-slate-600 inline-flex items-center"
                      title="เช่น กง-2345 หรือ กข-1234 บุรีรัมย์"
                    >
                      <Info size={14} aria-hidden="true" />
                    </span>
                    <div className="pointer-events-none absolute top-full left-0 mt-1.5 hidden group-hover:block z-50 w-56 p-2.5 bg-slate-900 text-white text-[11px] rounded-xl shadow-lg leading-relaxed">
                      <p className="font-semibold text-purple-200 mb-1">รูปแบบป้ายทะเบียน</p>
                      • เช่น กง-2345 (กทม.)<br />
                      • ต่างจังหวัด เช่น กข-1234 บุรีรัมย์
                    </div>
                  </div>
                </div>
                <input
                  id="v-plate"
                  {...register("license_plate", {
                    required: "ระบุป้ายทะเบียน",
                    pattern: { value: /.+-.+/, message: "ต้องมีเครื่องหมาย - คั่น" },
                  })}
                  placeholder="เช่น กง-2345…"
                  spellCheck={false}
                  className={clsx(
                    "block w-full border rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]",
                    errors.license_plate ? "border-red-500" : "border-slate-300",
                  )}
                />
                {errors.license_plate && (
                  <p className="text-xs text-red-600 mt-1">{errors.license_plate.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="v-type" className="block text-sm font-medium text-slate-700 mb-1">
                  ประเภทรถ *
                </label>
                <select
                  id="v-type"
                  {...register("type_id", { required: "กรุณาเลือกประเภทรถ" })}
                  className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                >
                  <option value="">เลือกประเภท</option>
                  {vehicleTypes.map((vt) => (
                    <option key={vt.type_id} value={vt.type_id}>
                      {vt.type_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="v-brand" className="block text-sm font-medium text-slate-700 mb-1">
                  ยี่ห้อ *
                </label>
                <input
                  id="v-brand"
                  {...register("brand", {
                    required: "กรุณาระบุยี่ห้อ",
                    maxLength: { value: 50, message: "ไม่เกิน 50 ตัวอักษร" },
                  })}
                  maxLength={50}
                  placeholder="เช่น Toyota…"
                  className={clsx(
                    "block w-full border rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]",
                    errors.brand ? "border-red-500" : "border-slate-300",
                  )}
                />
                {errors.brand && <p className="text-xs text-red-600 mt-1">{errors.brand.message}</p>}
              </div>

              <div>
                <label htmlFor="v-model" className="block text-sm font-medium text-slate-700 mb-1">
                  รุ่น *
                </label>
                <input
                  id="v-model"
                  {...register("model", {
                    required: "กรุณาระบุรุ่น",
                    maxLength: { value: 50, message: "ไม่เกิน 50 ตัวอักษร" },
                  })}
                  maxLength={50}
                  placeholder="เช่น Commuter…"
                  className={clsx(
                    "block w-full border rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]",
                    errors.model ? "border-red-500" : "border-slate-300",
                  )}
                />
                {errors.model && <p className="text-xs text-red-600 mt-1">{errors.model.message}</p>}
              </div>

              <div>
                <label htmlFor="v-color" className="block text-sm font-medium text-slate-700 mb-1">
                  สี
                </label>
                <input
                  id="v-color"
                  {...register("color", { maxLength: { value: 50, message: "ไม่เกิน 50 ตัวอักษร" } })}
                  maxLength={50}
                  placeholder="เช่น ขาว…"
                  className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                />
              </div>

              <div>
                <label htmlFor="v-year" className="block text-sm font-medium text-slate-700 mb-1">
                  ปีที่ผลิต (ค.ศ.) *
                </label>
                <input
                  id="v-year"
                  {...register("year", {
                    required: "กรุณาระบุปีที่ผลิต",
                    valueAsNumber: true,
                    min: { value: 1970, message: "ต้องเป็น ค.ศ. ตั้งแต่ 1970" },
                    max: {
                      value: new Date().getFullYear() + 1,
                      message: `ต้องไม่เกิน ค.ศ. ${new Date().getFullYear() + 1}`,
                    },
                  })}
                  type="number"
                  min="1970"
                  max={new Date().getFullYear() + 1}
                  onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                  placeholder={`เช่น ${new Date().getFullYear()}…`}
                  className={clsx(
                    "block w-full border rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]",
                    errors.year ? "border-red-500" : "border-slate-300",
                  )}
                />
                {errors.year && <p className="text-xs text-red-600 mt-1">{errors.year.message}</p>}
              </div>

              {/* Maintenance defaults preview */}
              <div className="sm:col-span-2 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">
                    รอบบำรุงรักษามาตรฐาน (อ้างอิงตามประเภทรถ)
                  </span>
                  <span className="text-[11px] font-medium text-[#8A1ABA] bg-purple-50 border border-purple-200/70 px-2 py-0.5 rounded-md">
                    {selectedTypeObj ? selectedTypeObj.type_name : "ยังไม่เลือกประเภท"}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs tabular-nums">
                  {[
                    { label: "Mineral", val: currentDefaults.mineral },
                    { label: "กึ่งสังเคราะห์", val: currentDefaults.semi },
                    { label: "สังเคราะห์แท้", val: currentDefaults.fully },
                    { label: "เปลี่ยนยาง", val: currentDefaults.tire },
                  ].map((d) => (
                    <div key={d.label} className="bg-white p-2 rounded-lg border border-slate-200/70">
                      <p className="text-[11px] text-slate-400">{d.label}</p>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {d.val?.toLocaleString("th-TH") || "-"} กม.
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="v-status" className="block text-sm font-medium text-slate-700 mb-1">
                  สถานะตัวรถ
                </label>
                <select
                  id="v-status"
                  {...register("status")}
                  className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                >
                  <option value="READY">พร้อมใช้งาน</option>
                  <option value="IN_REPAIR">กำลังซ่อม</option>
                </select>
              </div>

              <div>
                <label htmlFor="v-active" className="block text-sm font-medium text-slate-700 mb-1">
                  สถานะการใช้งาน
                </label>
                <select
                  id="v-active"
                  {...register("is_active")}
                  className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                >
                  <option value="true">ใช้งานปกติ</option>
                  <option value="false">ปลดระวาง (ซ่อนจากระบบ)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="v-driver" className="block text-sm font-medium text-slate-700 mb-1">
                  ผู้รับผิดชอบ (พขร.)
                </label>
                <select
                  id="v-driver"
                  {...register("driver_id")}
                  className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                >
                  <option value="">ไม่ระบุ</option>
                  {drivers.map((d) => (
                    <option key={d.driver_id} value={d.driver_id}>
                      {d.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#8A1ABA] hover:bg-[#73149c] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60 cursor-pointer"
              >
                {editing ? "บันทึกการแก้ไข" : "เพิ่มยานพาหนะ"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
