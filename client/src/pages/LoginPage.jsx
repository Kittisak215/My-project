import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { User, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState } from "react";
import api from "../lib/axios";
import useAuthStore from "../store/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      const res = await api.post("/auth/login", data);
      login(res.data.token, res.data.user);
      toast.success("เข้าสู่ระบบสำเร็จ", { toastId: "login-success" });
      const role = res.data.user.role;
      if (role === "ADMIN") navigate("/admin");
      else if (role === "EXECUTIVE") navigate("/executive");
      else navigate("/driver");
    } catch (err) {
      toast.error(err.response?.data?.message || "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง", {
        toastId: "login-error",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1FA] flex flex-col lg:flex-row">
      {/* Left Royal Purple Brand Panel */}
      <div className="lg:w-[46%] bg-gradient-to-br from-[#7A16A6] via-[#5B0F7E] to-[#34074B] text-white p-8 lg:p-14 flex flex-col justify-between relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex items-center gap-3.5">
          <div className="p-1.5 rounded-xl bg-white/15 border border-white/20 backdrop-blur-xs">
            <img
              src="/logo.png"
              alt="ตรามหาวิทยาลัยราชภัฏบุรีรัมย์"
              width={40}
              height={40}
              className="w-10 h-10 object-contain"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">
              มหาวิทยาลัยราชภัฏบุรีรัมย์
            </p>
            <p className="text-xs text-purple-200/85" translate="no">
              Buriram Rajabhat University
            </p>
          </div>
        </div>

        <div className="relative z-10 my-10 lg:my-0 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-medium text-purple-50 mb-5">
            <ShieldCheck size={14} className="text-purple-200" aria-hidden="true" />
            <span translate="no">V-Maintenance</span>
          </div>
          <h1 className="text-2xl lg:text-4xl font-bold tracking-tight leading-snug text-balance">
            ระบบบริหารซ่อมบำรุงยานพาหนะ
          </h1>
          <p className="text-sm lg:text-base text-purple-100/85 mt-3 leading-relaxed">
            ติดตามสถานะความพร้อมรถ แจ้งเตือนรอบเปลี่ยนถ่ายน้ำมันเครื่องและยาง
            พร้อมจัดการคำร้องซ่อมและงบประมาณในที่เดียว
          </p>
        </div>

        <div className="relative z-10 hidden lg:flex items-center gap-6 text-xs text-purple-200/75 border-t border-white/15 pt-6">
          <span>บันทึกเลขไมล์</span>
          <span>แจ้งเตือนอัตโนมัติ</span>
          <span>อนุมัติและสรุปค่าซ่อม</span>
        </div>
      </div>

      {/* Right Sign-in Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-purple-200/70 border-t-4 border-t-[#8A1ABA] shadow-sm p-7 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              เข้าสู่ระบบ
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              กรอกชื่อผู้ใช้งานและรหัสผ่านเพื่อเข้าใช้งาน
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label
                htmlFor="login-username"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                ชื่อผู้ใช้งาน
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  spellCheck={false}
                  {...register("username", { required: "กรุณากรอกชื่อผู้ใช้งาน" })}
                  className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 bg-slate-50/50 focus:bg-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] focus-visible:border-transparent transition-colors"
                  placeholder="ระบุชื่อผู้ใช้งาน…"
                />
              </div>
              {errors.username && (
                <p className="text-red-600 text-xs mt-1.5" role="alert">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                รหัสผ่าน
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  {...register("password", { required: "กรุณากรอกรหัสผ่าน" })}
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 bg-slate-50/50 focus:bg-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] focus-visible:border-transparent transition-colors"
                  placeholder="กรอกรหัสผ่าน…"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  className="absolute inset-y-0 right-2.5 flex items-center px-1 text-slate-400 hover:text-[#8A1ABA] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] rounded cursor-pointer"
                >
                  {showPass ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-600 text-xs mt-1.5" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#8A1ABA] hover:bg-[#73149c] disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] focus-visible:ring-offset-2 cursor-pointer"
            >
              {isSubmitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
