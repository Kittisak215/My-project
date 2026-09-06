import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import clsx from "clsx";
import { Settings, Plus, Edit2, Trash2, X } from "lucide-react";

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center p-5 md:p-6 border-b">
        <h3 className="text-base md:text-lg font-semibold text-slate-800">
          {title}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </div>
  </div>
);

export default function VehicleTypesPage() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const fetchTypes = useCallback(async () => {
    try {
      const res = await api.get("/vehicle-types");
      setTypes(res.data);
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
      tire_change_interval_km: 50000
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
        toast.success("แก้ไขประเภทรถสำเร็จ");
      } else {
        await api.post("/vehicle-types", data);
        toast.success("เพิ่มประเภทรถสำเร็จ");
      }
      setShowModal(false);
      fetchTypes();
    } catch (e) {
      toast.error(e.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("คุณต้องการลบประเภทรถนี้ใช่หรือไม่?")) return;
    try {
      await api.delete(`/vehicle-types/${id}`);
      toast.success("ลบประเภทรถสำเร็จ");
      fetchTypes();
    } catch (e) {
      toast.error(e.response?.data?.message || "ไม่สามารถลบได้ (อาจมีรถที่ใช้ประเภทนี้อยู่)");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#8A1ABA]" />
            จัดการประเภทยานพาหนะ
          </h1>
          <p className="text-slate-500 mt-1">เพิ่มหรือแก้ไขประเภทรถ และระยะทางการบำรุงรักษาตั้งต้น</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#8A1ABA] text-white rounded-lg hover:bg-[#7a16a8] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          เพิ่มประเภทรถ
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">รหัส</th>
                <th className="px-6 py-4 font-semibold">ชื่อประเภท</th>
                <th className="px-6 py-4 font-semibold text-center">Mineral (กม.)</th>
                <th className="px-6 py-4 font-semibold text-center">กึ่งสังเคราะห์ (กม.)</th>
                <th className="px-6 py-4 font-semibold text-center">สังเคราะห์แท้ (กม.)</th>
                <th className="px-6 py-4 font-semibold text-center">เปลี่ยนยาง (กม.)</th>
                <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                    กำลังโหลด...
                  </td>
                </tr>
              ) : types.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                types.map((type) => (
                  <tr key={type.type_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">{type.type_id}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{type.type_name}</td>
                    <td className="px-6 py-4 text-center">{type.oil_interval_mineral_km.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">{type.oil_interval_semi_synthetic_km.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">{type.oil_interval_fully_synthetic_km.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">{type.tire_change_interval_km.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(type)}
                          className="px-3 py-1 text-amber-500 border border-amber-300 hover:border-amber-500 hover:bg-amber-50 rounded-md font-medium transition-colors text-sm"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleDelete(type.type_id)}
                          className="px-3 py-1 text-red-500 border border-red-300 hover:border-red-500 hover:bg-red-50 rounded-md font-medium transition-colors text-sm"
                        >
                          ลบทิ้ง
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
              <label className="text-sm font-medium text-slate-700">ชื่อประเภทรถ *</label>
              <input
                {...register("type_name", { required: "ระบุชื่อประเภทรถ" })}
                placeholder="เช่น รถตู้ (Van)"
                className={clsx(
                  "mt-1 block w-full border rounded-lg px-3 py-2 text-sm focus:outline-none",
                  errors.type_name ? "border-red-500 focus:border-red-500" : "border-slate-300 focus:border-[#8A1ABA]"
                )}
              />
              {errors.type_name && <p className="text-xs text-red-500 mt-1">{errors.type_name.message}</p>}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <label className="text-sm font-semibold text-slate-800 block mb-3">ระยะทางเปลี่ยนน้ำมันเครื่อง (กม.) *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Mineral (กม.)</label>
                  <input
                    {...register("oil_interval_mineral_km", {
                      required: "ระบุระยะทาง",
                      valueAsNumber: true,
                      min: { value: 1000, message: "อย่างน้อย 1,000 กม." },
                      max: { value: 50000, message: "ไม่เกิน 50,000 กม." }
                    })}
                    type="number"
                    min={1000}
                    max={50000}
                    step={500}
                    onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                    className={clsx(
                      "block w-full border rounded-lg px-3 py-2 text-sm focus:outline-none",
                      errors.oil_interval_mineral_km ? "border-red-500 focus:border-red-500" : "border-slate-300 focus:border-[#8A1ABA]"
                    )}
                  />
                  {errors.oil_interval_mineral_km && <p className="text-xs text-red-500 mt-1">{errors.oil_interval_mineral_km.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">กึ่งสังเคราะห์ (กม.)</label>
                  <input
                    {...register("oil_interval_semi_synthetic_km", {
                      required: "ระบุระยะทาง",
                      valueAsNumber: true,
                      min: { value: 1000, message: "อย่างน้อย 1,000 กม." },
                      max: { value: 50000, message: "ไม่เกิน 50,000 กม." }
                    })}
                    type="number"
                    min={1000}
                    max={50000}
                    step={500}
                    onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                    className={clsx(
                      "block w-full border rounded-lg px-3 py-2 text-sm focus:outline-none",
                      errors.oil_interval_semi_synthetic_km ? "border-red-500 focus:border-red-500" : "border-slate-300 focus:border-[#8A1ABA]"
                    )}
                  />
                  {errors.oil_interval_semi_synthetic_km && <p className="text-xs text-red-500 mt-1">{errors.oil_interval_semi_synthetic_km.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">สังเคราะห์แท้ (กม.)</label>
                  <input
                    {...register("oil_interval_fully_synthetic_km", {
                      required: "ระบุระยะทาง",
                      valueAsNumber: true,
                      min: { value: 1000, message: "อย่างน้อย 1,000 กม." },
                      max: { value: 50000, message: "ไม่เกิน 50,000 กม." }
                    })}
                    type="number"
                    min={1000}
                    max={50000}
                    step={500}
                    onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                    className={clsx(
                      "block w-full border rounded-lg px-3 py-2 text-sm focus:outline-none",
                      errors.oil_interval_fully_synthetic_km ? "border-red-500 focus:border-red-500" : "border-slate-300 focus:border-[#8A1ABA]"
                    )}
                  />
                  {errors.oil_interval_fully_synthetic_km && <p className="text-xs text-red-500 mt-1">{errors.oil_interval_fully_synthetic_km.message}</p>}
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">ระยะทางเปลี่ยนยาง (กม.) *</label>
              <input
                {...register("tire_change_interval_km", {
                  required: "ระบุระยะทางเปลี่ยนยาง",
                  valueAsNumber: true,
                  min: { value: 5000, message: "อย่างน้อย 5,000 กม." },
                  max: { value: 200000, message: "ไม่เกิน 200,000 กม." }
                })}
                type="number"
                min={5000}
                max={200000}
                step={1000}
                onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                className={clsx(
                  "mt-1 block w-full border rounded-lg px-3 py-2 text-sm focus:outline-none",
                  errors.tire_change_interval_km ? "border-red-500 focus:border-red-500" : "border-slate-300 focus:border-[#8A1ABA]"
                )}
              />
              {errors.tire_change_interval_km && <p className="text-xs text-red-500 mt-1">{errors.tire_change_interval_km.message}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-6">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#8A1ABA] text-white rounded-lg hover:bg-[#7a16a8] transition-colors"
              >
                {editing ? "บันทึกการแก้ไข" : "เพิ่มข้อมูล"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
