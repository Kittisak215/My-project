import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Trash2, AlertTriangle } from "lucide-react";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import clsx from "clsx";
import Skeleton from "../../components/Skeleton";
import Modal from "../../components/Modal";
import { formatPhone } from "../../utils/format";

const GarageStatusPill = ({ isActive }) => (
  <span
    className={clsx(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
      isActive !== false
        ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
        : "bg-slate-100 text-slate-600 border-slate-200/80",
    )}
  >
    <span
      className={clsx(
        "w-1.5 h-1.5 rounded-full",
        isActive !== false ? "bg-emerald-500" : "bg-slate-400",
      )}
      aria-hidden="true"
    />
    {isActive !== false ? "ใช้งาน" : "ระงับ"}
  </span>
);

const specLabels = {
  GENERAL: "ทั่วไป",
  ENGINE: "เครื่องยนต์",
  ELECTRICAL: "ระบบไฟ",
  SUSPENSION: "ช่วงล่าง",
  BODY_PAINT: "ตัวถังและสี",
  TIRES: "ยาง",
};

export default function GaragesPage() {
  const [garages, setGarages] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [specFilter, setSpecFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();
  const limit = 10;

  const fetchGarages = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search, page, limit };
      if (specFilter !== "ALL") params.specialization = specFilter;
      const res = await api.get("/garages", { params });
      setGarages(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error("โหลดข้อมูลอู่/ศูนย์บริการไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [search, specFilter, page]);

  useEffect(() => {
    fetchGarages();
  }, [fetchGarages]);

  const openCreate = () => {
    setEditing(null);
    reset({
      garage_name: "",
      phone: "",
      address: "",
      sub_district: "",
      district: "",
      province: "",
      postal_code: "",
      specialization: ["GENERAL"],
      is_active: "true",
    });
    setShowModal(true);
  };

  const openEdit = (g) => {
    setEditing(g);
    reset({
      garage_name: g.garage_name,
      phone: g.phone,
      address: g.address,
      sub_district: g.sub_district,
      district: g.district,
      province: g.province,
      postal_code: g.postal_code,
      specialization: g.specialization || ["GENERAL"],
      is_active: g.is_active !== false ? "true" : "false",
    });
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, is_active: data.is_active === "true" };
      if (editing) await api.put(`/garages/${editing.garage_id}`, payload);
      else await api.post("/garages", payload);
      toast.success(editing ? "บันทึกการแก้ไขแล้ว" : "เพิ่มอู่/ศูนย์บริการแล้ว");
      setShowModal(false);
      fetchGarages();
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/garages/${deleteTarget.garage_id}`);
      toast.success("ลบข้อมูลอู่/ศูนย์บริการแล้ว");
      setDeleteTarget(null);
      fetchGarages();
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาดในการลบข้อมูล");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            ศูนย์บริการและอู่ซ่อม
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            รายชื่อศูนย์บริการและอู่คู่สัญญาแยกตามความเชี่ยวชาญ ({total.toLocaleString("th-TH")} แห่ง)
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#8A1ABA] hover:bg-[#73149c] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] focus-visible:ring-offset-2 cursor-pointer"
        >
          <Plus size={16} aria-hidden="true" />
          เพิ่มอู่/ศูนย์บริการ
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <label htmlFor="garage-search" className="sr-only">
            ค้นหาชื่ออู่
          </label>
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="garage-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="ค้นหาชื่ออู่/ศูนย์บริการ…"
            autoComplete="off"
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] transition-colors"
          />
        </div>
        <div>
          <label htmlFor="garage-spec" className="sr-only">
            กรองตามความเชี่ยวชาญ
          </label>
          <select
            id="garage-spec"
            value={specFilter}
            onChange={(e) => {
              setSpecFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-52 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] transition-colors"
          >
            <option value="ALL">ความเชี่ยวชาญทั้งหมด</option>
            <option value="GENERAL">ซ่อมทั่วไป</option>
            <option value="ENGINE">เครื่องยนต์</option>
            <option value="ELECTRICAL">ระบบไฟ</option>
            <option value="SUSPENSION">ช่วงล่าง</option>
            <option value="BODY_PAINT">ตัวถังและสี</option>
            <option value="TIRES">ยางรถยนต์</option>
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
        {!loading && garages.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/90 py-12 text-center text-slate-400 text-sm">
            ไม่พบข้อมูลอู่/ศูนย์บริการ
          </div>
        )}
        {!loading &&
          garages.map((g) => (
            <div
              key={g.garage_id}
              className={clsx(
                "bg-white rounded-2xl border border-slate-200/90 p-4 space-y-2.5",
                g.is_active === false && "opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{g.garage_name}</p>
                    <GarageStatusPill isActive={g.is_active} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 tabular-nums">{formatPhone(g.phone)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(g)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer"
                  >
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(g)}
                    aria-label={`ลบ ${g.garage_name}`}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200/70 cursor-pointer"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.specialization?.map((spec) => (
                  <span
                    key={spec}
                    className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium"
                  >
                    {specLabels[spec] || spec}
                  </span>
                ))}
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
                <th className="px-5 py-3.5">ชื่ออู่ / ศูนย์บริการ</th>
                <th className="px-4 py-3.5">ความเชี่ยวชาญ</th>
                <th className="px-4 py-3.5">เบอร์โทรศัพท์</th>
                <th className="px-4 py-3.5">ที่อยู่</th>
                <th className="px-4 py-3.5 text-center">สถานะ</th>
                <th className="px-5 py-3.5 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading &&
                [1, 2, 3, 4].map((item) => (
                  <tr key={`sk-${item}`}>
                    <td colSpan={6} className="px-5 py-4">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))}
              {!loading && garages.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    ไม่พบข้อมูลอู่/ศูนย์บริการ
                  </td>
                </tr>
              )}
              {!loading &&
                garages.map((g) => (
                  <tr
                    key={g.garage_id}
                    className={clsx(
                      "hover:bg-slate-50/70 transition-colors",
                      g.is_active === false && "opacity-65",
                    )}
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{g.garage_name}</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">#{g.garage_id}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {g.specialization?.map((spec) => (
                          <span
                            key={spec}
                            className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-xs font-medium"
                          >
                            {specLabels[spec] || spec}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 tabular-nums whitespace-nowrap">
                      {formatPhone(g.phone)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate text-xs">
                      {[g.address, g.sub_district, g.district, g.province, g.postal_code]
                        .filter(Boolean)
                        .join(" ") || "-"}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <GarageStatusPill isActive={g.is_active} />
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(g)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-[#8A1ABA] bg-white hover:bg-purple-50 rounded-lg border border-slate-200 hover:border-purple-200 transition-colors cursor-pointer"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(g)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200/80 transition-colors cursor-pointer"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span className="tabular-nums">
            แสดง {garages.length} จากทั้งหมด {total.toLocaleString("th-TH")} รายการ
          </span>
          {total > limit && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 disabled:opacity-40 cursor-pointer"
              >
                ก่อนหน้า
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 disabled:opacity-40 cursor-pointer"
              >
                ถัดไป
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <Modal
          title={editing ? "แก้ไขอู่/ศูนย์บริการ" : "เพิ่มอู่/ศูนย์บริการ"}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="g-name" className="block text-sm font-medium text-slate-700 mb-1">
                ชื่ออู่/ศูนย์บริการ *
              </label>
              <input
                id="g-name"
                {...register("garage_name", {
                  required: "กรุณาระบุชื่ออู่/ศูนย์บริการ",
                  maxLength: { value: 100, message: "ความยาวไม่เกิน 100 ตัวอักษร" },
                })}
                className={clsx(
                  "block w-full border rounded-xl px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]",
                  errors.garage_name ? "border-red-500" : "border-slate-300",
                )}
              />
              {errors.garage_name && (
                <p className="text-xs text-red-600 mt-1">{errors.garage_name.message}</p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">ความเชี่ยวชาญ (เลือกได้หลายอย่าง)</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "GENERAL", label: "ซ่อมทั่วไป" },
                  { id: "ENGINE", label: "เครื่องยนต์" },
                  { id: "ELECTRICAL", label: "ระบบไฟ" },
                  { id: "SUSPENSION", label: "ช่วงล่าง" },
                  { id: "BODY_PAINT", label: "ตัวถังและสี" },
                  { id: "TIRES", label: "ยางรถยนต์" },
                ].map((spec) => (
                  <label
                    key={spec.id}
                    className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/70 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      value={spec.id}
                      {...register("specialization")}
                      className="rounded border-slate-300 accent-[#8A1ABA]"
                    />
                    <span>{spec.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="g-phone" className="block text-sm font-medium text-slate-700 mb-1">
                เบอร์โทรศัพท์ *
              </label>
              <input
                id="g-phone"
                type="tel"
                maxLength={10}
                placeholder="เช่น 044123456 หรือ 0812345678…"
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/\D/g, "");
                }}
                {...register("phone", {
                  required: "กรุณาระบุเบอร์โทรศัพท์",
                  pattern: {
                    value: /^0\d{8,9}$/,
                    message: "ต้องเป็นตัวเลข 9-10 หลัก ขึ้นต้นด้วย 0",
                  },
                })}
                className={clsx(
                  "block w-full border rounded-xl px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]",
                  errors.phone ? "border-red-500" : "border-slate-300",
                )}
              />
              {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label htmlFor="g-addr" className="block text-sm font-medium text-slate-700 mb-1">
                บ้านเลขที่ / ถนน
              </label>
              <textarea
                id="g-addr"
                {...register("address")}
                rows={2}
                className="block w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="g-sub" className="block text-sm font-medium text-slate-700 mb-1">
                  ตำบล/แขวง
                </label>
                <input
                  id="g-sub"
                  {...register("sub_district")}
                  className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                />
              </div>
              <div>
                <label htmlFor="g-dist" className="block text-sm font-medium text-slate-700 mb-1">
                  อำเภอ/เขต
                </label>
                <input
                  id="g-dist"
                  {...register("district")}
                  className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                />
              </div>
              <div>
                <label htmlFor="g-prov" className="block text-sm font-medium text-slate-700 mb-1">
                  จังหวัด
                </label>
                <input
                  id="g-prov"
                  {...register("province")}
                  className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                />
              </div>
              <div>
                <label htmlFor="g-post" className="block text-sm font-medium text-slate-700 mb-1">
                  รหัสไปรษณีย์
                </label>
                <input
                  id="g-post"
                  type="text"
                  maxLength={5}
                  placeholder="เช่น 31000…"
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/\D/g, "");
                  }}
                  {...register("postal_code", {
                    validate: (val) =>
                      !val || /^\d{5}$/.test(val) || "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก",
                  })}
                  className={clsx(
                    "block w-full border rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]",
                    errors.postal_code ? "border-red-500" : "border-slate-300",
                  )}
                />
                {errors.postal_code && (
                  <p className="text-xs text-red-600 mt-1">{errors.postal_code.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="g-active" className="block text-sm font-medium text-slate-700 mb-1">
                สถานะการติดต่อ
              </label>
              <select
                id="g-active"
                {...register("is_active")}
                className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
              >
                <option value="true">ใช้งาน (เปิดรับงานซ่อม)</option>
                <option value="false">ระงับการติดต่อ (ซ่อนจากระบบ)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#8A1ABA] hover:bg-[#73149c] text-white rounded-xl text-sm font-medium disabled:opacity-60 cursor-pointer"
              >
                {editing ? "บันทึกการแก้ไข" : "เพิ่มอู่/ศูนย์บริการ"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="ยืนยันการลบอู่/ศูนย์บริการ"
          onClose={() => setDeleteTarget(null)}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-red-50 rounded-xl text-red-700 border border-red-200/70">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-semibold text-slate-900">ต้องการลบข้อมูลอู่นี้ใช่หรือไม่?</p>
                <p className="text-xs text-slate-600 mt-1">
                  {deleteTarget.garage_name}
                  {deleteTarget.phone && ` (${formatPhone(deleteTarget.phone)})`}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              ลบได้เฉพาะอู่ที่ยังไม่มีประวัติการส่งซ่อมในระบบ หากมีประวัติแนะนำให้เปลี่ยนสถานะเป็น “ระงับการติดต่อ” แทน
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-sm font-medium cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={15} aria-hidden="true" />
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
