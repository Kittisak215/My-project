import { useState } from "react";
import { useForm } from "react-hook-form";
import { Lock, Save, Phone } from "lucide-react";
import useAuthStore from "../../store/authStore";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import clsx from "clsx";
import { formatPhone } from "../../utils/format";

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm();

  const onSubmit = async (data) => {
    if (data.new_password !== data.confirm_password) {
      toast.error("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }

    setLoading(true);
    try {
      await api.put("/auth/change-password", {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      toast.success("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน");
    } finally {
      setLoading(false);
    }
  };

  const displayName = user?.full_name || user?.driver?.full_name || "-";
  const displayPhone = formatPhone(user?.driver?.phone || user?.phone);
  const displayUsername = user?.username || "-";

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          จัดการบัญชีผู้ใช้
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          ตรวจสอบข้อมูลส่วนตัวและเปลี่ยนรหัสผ่านสำหรับเข้าสู่ระบบ
        </p>
      </div>

      {/* Account Info */}
      <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">ข้อมูลส่วนตัว</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            หากต้องการแก้ไขชื่อหรือเบอร์โทรศัพท์ กรุณาติดต่อผู้ดูแลระบบ
          </p>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500 mb-1">ชื่อผู้ใช้งาน (Username)</p>
            <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 font-medium">
              {displayUsername}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">ชื่อ - นามสกุล</p>
            <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 font-medium">
              {displayName}
            </div>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-slate-500 mb-1">เบอร์โทรศัพท์</p>
            <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 font-medium flex items-center gap-2 tabular-nums">
              <Phone size={15} className="text-slate-400" aria-hidden="true" />
              {displayPhone}
            </div>
          </div>
        </div>
      </section>

      {/* Change Password */}
      <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">เปลี่ยนรหัสผ่าน</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ตั้งรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษรเพื่อความปลอดภัยของบัญชี
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label htmlFor="p-current" className="block text-sm font-medium text-slate-700 mb-1.5">
              รหัสผ่านปัจจุบัน
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="p-current"
                type="password"
                autoComplete="current-password"
                {...register("current_password", { required: "กรุณากรอกรหัสผ่านปัจจุบัน" })}
                className={clsx(
                  "w-full pl-10 pr-3.5 py-2.5 border rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]",
                  errors.current_password ? "border-red-500" : "border-slate-300",
                )}
                placeholder="กรอกรหัสผ่านปัจจุบัน…"
              />
            </div>
            {errors.current_password && (
              <p className="text-xs text-red-600 mt-1">{errors.current_password.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-new" className="block text-sm font-medium text-slate-700 mb-1.5">
                รหัสผ่านใหม่
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="p-new"
                  type="password"
                  autoComplete="new-password"
                  {...register("new_password", {
                    required: "กรุณากรอกรหัสผ่านใหม่",
                    minLength: { value: 6, message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" },
                  })}
                  className={clsx(
                    "w-full pl-10 pr-3.5 py-2.5 border rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]",
                    errors.new_password ? "border-red-500" : "border-slate-300",
                  )}
                  placeholder="อย่างน้อย 6 ตัวอักษร…"
                />
              </div>
              {errors.new_password && (
                <p className="text-xs text-red-600 mt-1">{errors.new_password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="p-confirm" className="block text-sm font-medium text-slate-700 mb-1.5">
                ยืนยันรหัสผ่านใหม่
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="p-confirm"
                  type="password"
                  autoComplete="new-password"
                  {...register("confirm_password", { required: "กรุณายืนยันรหัสผ่านใหม่" })}
                  className={clsx(
                    "w-full pl-10 pr-3.5 py-2.5 border rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]",
                    errors.confirm_password ? "border-red-500" : "border-slate-300",
                  )}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง…"
                />
              </div>
              {errors.confirm_password && (
                <p className="text-xs text-red-600 mt-1">{errors.confirm_password.message}</p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={loading || !isDirty}
              className="bg-[#8A1ABA] hover:bg-[#73149c] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Save size={16} aria-hidden="true" />
              {loading ? "กำลังบันทึก…" : "บันทึกรหัสผ่านใหม่"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
