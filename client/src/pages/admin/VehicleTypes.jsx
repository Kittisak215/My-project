import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import clsx from "clsx";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import Modal from "../../components/Modal";
import Skeleton from "../../components/Skeleton";

export default function VehicleTypesPage() {
  const [types, setTypes] = useState([]);
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

  const fetchTypes = useCallback(async () => {
    try {
      const res = await api.get("/vehicle-types");
      setTypes(res.data || []);
    } catch {
      toast.error("โหลดข้อมูลประเภทรถไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const openCreate = () => {
    setEditing(null);
    reset({
      type_name: "",
      oil_interval_mineral_km: 5000,
      oil_interval_semi_synthetic_km: 7000,
      oil_interval_fully_synthetic_km: 10000,
      tire_change_interval_km: 50000,
    });
    setShowModal(true);
  };

  const openEdit = (type) => {
    setEditing(type);
    reset(type);
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await api.put(`/vehicle-types/${editing.type_id}`, data);
        toast.success("บันทึกการแก้ไขประเภทรถแล้ว");
      } else {
        await api.post("/vehicle-types", data);
        toast.success("เพิ่มประเภทรถแล้ว");
      }
      setShowModal(false);
      fetchTypes();
    } catch (e) {
      toast.error(e.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/vehicle-types/${deleteTarget.type_id}`);
      toast.success("ลบประเภทรถแล้ว");
      setDeleteTarget(null);
      fetchTypes();
    } catch (e) {
      toast.error(e.response?.data?.message || "ไม่สามารถลบได้ (อาจมีรถที่ใช้ประเภทนี้อยู่)");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            ตั้งค่าประเภทยานพาหนะ
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            กำหนดระยะทางมาตรฐานสำหรับเปลี่ยนถ่ายน้ำมันเครื่องและเปลี่ยนยางแยกตามประเภทรถ
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 bg-[#8A1ABA] hover:bg-[#73149c] text-white text-sm font-medium rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] focus-visible:ring-offset-2 cursor-pointer"
        >
          <Plus size={16} aria-hidden="true" />
          เพิ่มประเภทรถ
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-xs font-medium border-b border-slate-200/80">
                <th className="px-5 py-3.5">ชื่อประเภท</th>
                <th className="px-4 py-3.5 text-right">น้ำมันธรรมดา (กม.)</th>
                <th className="px-4 py-3.5 text-right">กึ่งสังเคราะห์ (กม.)</th>
                <th className="px-4 py-3.5 text-right">สังเคราะห์แท้ (กม.)</th>
                <th className="px-4 py-3.5 text-right">เปลี่ยนยาง (กม.)</th>
                <th className="px-5 py-3.5 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-5 py-4">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : types.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    ไม่พบข้อมูลประเภทรถ
                  </td>
                </tr>
              ) : (
                types.map((type) => (
                  <tr key={type.type_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{type.type_name}</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">#{type.type_id}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-700 tabular-nums">
                      {type.oil_interval_mineral_km.toLocaleString("th-TH")}
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-700 tabular-nums">
                      {type.oil_interval_semi_synthetic_km.toLocaleString("th-TH")}
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-700 tabular-nums">
                      {type.oil_interval_fully_synthetic_km.toLocaleString("th-TH")}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-900 tabular-nums">
                      {type.tire_change_interval_km.toLocaleString("th-TH")}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(type)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-[#8A1ABA] bg-white hover:bg-purple-50 rounded-lg border border-slate-200 hover:border-purple-200 transition-colors cursor-pointer"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(type)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200/80 transition-colors cursor-pointer"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal
          title={editing ? "แก้ไขประเภทรถ" : "เพิ่มประเภทรถ"}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="vt-name" className="block text-sm font-medium text-slate-700 mb-1">
                ชื่อประเภทรถ *
              </label>
              <input
                id="vt-name"
                {...register("type_name", { required: "ระบุชื่อประเภทรถ" })}
                placeholder="เช่น รถตู้ (Van)…"
                className={clsx(
                  "block w-full border rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]",
                  errors.type_name ? "border-red-500" : "border-slate-300",
                )}
              />
              {errors.type_name && (
                <p className="text-xs text-red-600 mt-1">{errors.type_name.message}</p>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <p className="text-xs font-semibold text-slate-800">
                ระยะทางเปลี่ยนน้ำมันเครื่อง (กม.) *
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "oil_interval_mineral_km", label: "Mineral" },
                  { id: "oil_interval_semi_synthetic_km", label: "กึ่งสังเคราะห์" },
                  { id: "oil_interval_fully_synthetic_km", label: "สังเคราะห์แท้" },
                ].map((field) => (
                  <div key={field.id}>
                    <label
                      htmlFor={field.id}
                      className="text-xs font-medium text-slate-600 mb-1 block"
                    >
                      {field.label}
                    </label>
                    <input
                      id={field.id}
                      {...register(field.id, {
                        required: "ระบุระยะทาง",
                        valueAsNumber: true,
                        min: { value: 1000, message: "อย่างน้อย 1,000 กม." },
                        max: { value: 50000, message: "ไม่เกิน 50,000 กม." },
                      })}
                      type="number"
                      min={1000}
                      max={50000}
                      step={500}
                      onKeyDown={(e) =>
                        ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()
                      }
                      className={clsx(
                        "block w-full bg-white border rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]",
                        errors[field.id] ? "border-red-500" : "border-slate-300",
                      )}
                    />
                    {errors[field.id] && (
                      <p className="text-xs text-red-600 mt-1">{errors[field.id].message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="vt-tire" className="block text-sm font-medium text-slate-700 mb-1">
                ระยะทางเปลี่ยนยาง (กม.) *
              </label>
              <input
                id="vt-tire"
                {...register("tire_change_interval_km", {
                  required: "ระบุระยะทางเปลี่ยนยาง",
                  valueAsNumber: true,
                  min: { value: 5000, message: "อย่างน้อย 5,000 กม." },
                  max: { value: 200000, message: "ไม่เกิน 200,000 กม." },
                })}
                type="number"
                min={5000}
                max={200000}
                step={1000}
                onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                className={clsx(
                  "block w-full border rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]",
                  errors.tire_change_interval_km ? "border-red-500" : "border-slate-300",
                )}
              />
              {errors.tire_change_interval_km && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.tire_change_interval_km.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#8A1ABA] hover:bg-[#73149c] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60 cursor-pointer"
              >
                {editing ? "บันทึกการแก้ไข" : "เพิ่มข้อมูล"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="ยืนยันการลบประเภทรถ"
          onClose={() => setDeleteTarget(null)}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-red-50 rounded-xl text-red-700 border border-red-200/70">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-semibold text-slate-900">ต้องการลบประเภทรถนี้ใช่หรือไม่?</p>
                <p className="text-xs text-slate-600 mt-1">
                  ประเภทรถ: <span className="font-semibold text-red-700">{deleteTarget.type_name}</span>
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              ลบได้เฉพาะประเภทรถที่ยังไม่มียานพาหนะในระบบเชื่อมโยงอยู่เท่านั้น
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer"
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
