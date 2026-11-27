import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import clsx from "clsx";
import Skeleton from "../../components/Skeleton";
import Modal from "../../components/Modal";
import useAuthStore from "../../store/authStore";

const RoleBadge = ({ role }) => {
  const roles = {
    ADMIN: { text: "ผู้ดูแลระบบ", colors: "bg-purple-50 text-[#8A1ABA] border-purple-200/80" },
    EXECUTIVE: { text: "ผู้บริหาร", colors: "bg-amber-50 text-amber-700 border-amber-200/80" },
    DRIVER: { text: "ผู้ขับรถ", colors: "bg-sky-50 text-sky-700 border-sky-200/80" },
  };
  const r = roles[role] || {
    text: role,
    colors: "bg-slate-100 text-slate-700 border-slate-200/80",
  };
  return (
    <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap", r.colors)}>
      {r.text}
    </span>
  );
};

const ActivePill = ({ isActive }) => (
  <span
    className={clsx(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
      isActive
        ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
        : "bg-slate-100 text-slate-600 border-slate-200/80",
    )}
  >
    <span
      className={clsx("w-1.5 h-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-slate-400")}
      aria-hidden="true"
    />
    {isActive ? "ใช้งาน" : "ระงับ"}
  </span>
);

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(res.data.data || []);
    } catch {
      toast.error("โหลดข้อมูลผู้ใช้งานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      (u.full_name?.toLowerCase() || "").includes(q) ||
      (u.username?.toLowerCase() || "").includes(q);
    const matchRole = roleFilter === "" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const openEdit = (u) => {
    setEditing(u);
    reset({ role: u.role, is_active: u.is_active ? "true" : "false" });
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    try {
      const payload = { role: data.role, is_active: data.is_active === "true" };
      await api.put(`/users/${editing.user_id}`, payload);
      toast.success("บันทึกสิทธิ์ผู้ใช้งานแล้ว");
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-10">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          ผู้ใช้งานระบบ
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          กำหนดสิทธิ์การเข้าถึงและสถานะบัญชีผู้ใช้งานทั้งหมด ({users.length} บัญชี)
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <label htmlFor="user-search" className="sr-only">
            ค้นหาชื่อหรือ username
          </label>
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="user-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ, username…"
            autoComplete="off"
            spellCheck={false}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] transition-colors"
          />
        </div>
        <div>
          <label htmlFor="user-role" className="sr-only">
            กรองตามระดับผู้ใช้งาน
          </label>
          <select
            id="user-role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-44 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] transition-colors"
          >
            <option value="">ทุกระดับ</option>
            <option value="ADMIN">ผู้ดูแลระบบ</option>
            <option value="EXECUTIVE">ผู้บริหาร</option>
            <option value="DRIVER">ผู้ขับรถ</option>
          </select>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading && (
          <>
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </>
        )}
        {!loading && filteredUsers.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/90 py-12 text-center text-slate-400 text-sm">
            ไม่พบข้อมูลผู้ใช้งาน
          </div>
        )}
        {!loading &&
          filteredUsers.map((u) => (
            <div
              key={u.user_id}
              className={clsx(
                "bg-white rounded-2xl border border-slate-200/90 p-4 flex items-start justify-between gap-3",
                !u.is_active && "opacity-70",
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <RoleBadge role={u.role} />
                  <ActivePill isActive={u.is_active} />
                </div>
                <p className="font-semibold text-slate-900">{u.full_name}</p>
                <p className="text-xs text-slate-500">@{u.username}</p>
              </div>
              <button
                type="button"
                onClick={() => openEdit(u)}
                disabled={currentUser?.user_id === u.user_id}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 rounded-lg border border-slate-200 disabled:opacity-35 shrink-0 cursor-pointer"
              >
                แก้ไข
              </button>
            </div>
          ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-xs font-medium border-b border-slate-200/80">
                <th className="px-5 py-3.5">ชื่อผู้ใช้งาน (Username)</th>
                <th className="px-4 py-3.5">ชื่อ - นามสกุล</th>
                <th className="px-4 py-3.5 text-center">ระดับสิทธิ์</th>
                <th className="px-4 py-3.5 text-center">สถานะ</th>
                <th className="px-5 py-3.5 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading &&
                [1, 2, 3, 4].map((item) => (
                  <tr key={`sk-${item}`}>
                    <td colSpan={5} className="px-5 py-4">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    ไม่พบข้อมูลผู้ใช้งาน
                  </td>
                </tr>
              )}
              {!loading &&
                filteredUsers.map((u) => (
                  <tr
                    key={u.user_id}
                    className={clsx(
                      "hover:bg-slate-50/70 transition-colors",
                      !u.is_active && "opacity-65",
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">@{u.username}</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">#{u.user_id}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-slate-900 font-medium">{u.full_name}</div>
                      {u.driver && (
                        <div className="text-xs text-slate-500">พขร. #{u.driver.driver_id}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <ActivePill isActive={u.is_active} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        disabled={currentUser?.user_id === u.user_id}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-[#8A1ABA] bg-white hover:bg-purple-50 rounded-lg border border-slate-200 hover:border-purple-200 transition-colors disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                      >
                        แก้ไขสิทธิ์
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 tabular-nums">
          แสดง {filteredUsers.length} รายการ
        </div>
      </div>

      {showModal && editing && (
        <Modal title="แก้ไขสิทธิ์ผู้ใช้งาน" onClose={() => setShowModal(false)} maxWidth="max-w-md">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <p className="text-sm font-semibold text-slate-900">{editing.full_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">@{editing.username}</p>
            </div>
            <div>
              <label htmlFor="u-role" className="block text-sm font-medium text-slate-700 mb-1">
                ระดับผู้ใช้งาน
              </label>
              <select
                id="u-role"
                {...register("role")}
                className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
              >
                <option value="DRIVER">ผู้ขับรถ (Driver)</option>
                <option value="EXECUTIVE">ผู้บริหาร (Executive)</option>
                <option value="ADMIN">ผู้ดูแลระบบ (Admin)</option>
              </select>
            </div>
            <div>
              <label htmlFor="u-active" className="block text-sm font-medium text-slate-700 mb-1">
                สถานะบัญชี
              </label>
              <select
                id="u-active"
                {...register("is_active")}
                className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
              >
                <option value="true">ใช้งานได้ปกติ</option>
                <option value="false">ระงับการใช้งาน</option>
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
                บันทึก
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
