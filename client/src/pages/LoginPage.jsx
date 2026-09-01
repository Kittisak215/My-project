import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { User, Lock, Eye, EyeOff } from "lucide-react";
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
      toast.success("เข้าสู่ระบบสำเร็จ!");
      const role = res.data.user.role;
      if (role === "ADMIN") navigate("/admin");
      else if (role === "EXECUTIVE") navigate("/executive");
      else navigate("/driver");
    } catch (err) {
      toast.error(err.response?.data?.message || "เข้าสู่ระบบไม่สำเร็จ");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-slate-300">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl shadow-purple-950/15 overflow-hidden border border-purple-100/60">
        <div className="bg-[#8A1ABA] pt-8 pb-6 px-8 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-28 h-28 object-contain drop-shadow-md"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1 drop-shadow-sm">
            V-Maintenance
          </h1>
          <p className="text-purple-100 text-sm">
            ระบบบริหารซ่อมบำรุงหน่วยยานพาหนะ
          </p>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">
            เข้าสู่ระบบ
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ชื่อผู้ใช้งาน
              </label>
              <div className="relative group">
                <User
                  size={16}
                  className="absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-500 transition-colors"
                />
                <input
                  {...register("username", { required: "กรุณากรอกชื่อผู้ใช้" })}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 bg-slate-50 focus:bg-white transition-all"
                  placeholder="กรอกชื่อผู้ใช้งาน"
                />
              </div>
              {errors.username && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                รหัสผ่าน
              </label>
              <div className="relative group">
                <Lock
                  size={16}
                  className="absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-500 transition-colors"
                />
                <input
                  {...register("password", { required: "กรุณากรอกรหัสผ่าน" })}
                  type={showPass ? "text" : "password"}
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 bg-slate-50 focus:bg-white transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-purple-600 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-lg shadow-purple-600/30 hover:shadow-purple-600/45 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 transition-all duration-300 active:scale-[0.98]"
            >
              {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
