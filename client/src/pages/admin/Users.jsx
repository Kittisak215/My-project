import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import clsx from "clsx";
import Skeleton from "../../components/Skeleton";
import useAuthStore from "../../store/authStore";

const RoleBadge = ({ role }) => {
  const roles = {
    ADMIN: { text: "ผู้ดูแลระบบ", colors: "bg-red-100 text-red-700" },
    EXECUTIVE: { text: "ผู้บริหาร", colors: "bg-amber-100 text-amber-700" },
    DRIVER: { text: "ผู้ขับรถ", colors: "bg-emerald-100 text-emerald-700" },
  };
  const r = roles[role] || {
    text: role,
    colors: "bg-slate-100 text-slate-700",
  };
  return (
    <span
      className={clsx("px-2.5 py-1 rounded-full text-xs font-medium", r.colors)}
    >
      {r.text}
    </span>
  );
};

const StatusBadge = ({ isActive }) => (
  <span
    className={clsx(
      "px-2.5 py-1 rounded-full text-xs font-medium",
      isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600",
    )}
  >
    {isActive ? "🟢 ใช้งาน" : "⚫ ระงับ"}
  </span>
);

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center p-5 md:p-6 border-b">
        <h3 className="text-base md:text-lg font-semibold text-slate-800">
          {title}
        </h3>
        <button type="button" onClick={onClose}>
          <X size={20} className="text-slate-400" />
        </button>
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </div>
  </div>
);

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const { register, handleSubmit, reset } = useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(res.data.data);
    } catch {
      toast.error("โหลดข้อมูลผู้ใช้งานไม่สำเร็จ");
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      (u.full_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (u.username?.toLowerCase() || "").includes(search.toLowerCase());
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
      toast.success("แก้ไขข้อมูลสำเร็จ");
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center bg-white p-4 rounded-xl shadow-sm mb-4 md:mb-6 gap-3 border border-slate-100">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, username..."
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-full sm:w-56"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">ทุกระดับ</option>
            <option value="ADMIN">ผู้ดูแลระบบ</option>
            <option value="EXECUTIVE">ผู้บริหาร</option>
            <option value="DRIVER">ผู้ขับรถ</option>
          </select>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3 mb-4">
        {loading && (
          <>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </>
        )}
        {!loading && filteredUsers.length === 0 && (
          <p className="text-center py-8 text-slate-400">ไม่พบข้อมูล</p>
        )}
        {filteredUsers.map((u) => (
          <div
            key={u.user_id}
            className={clsx(
              "bg-white rounded-xl border border-slate-200 p-4 shadow-sm",
              !u.is_active && "opacity-70",
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs text-slate-400">#{u.user_id}</span>
                  <RoleBadge role={u.role} />
                  <StatusBadge isActive={u.is_active} />
                </div>
                <p className="font-semibold text-slate-800">{u.full_name}</p>
                <p className="text-sm text-slate-500">@{u.username}</p>
                {u.driver && (
                  <p className="text-xs text-blue-600 mt-1">
                    พขร. ID: #{u.driver.driver_id}
                  </p>
                )}
              </div>
              <button
                onClick={() => openEdit(u)}
                disabled={currentUser?.user_id === u.user_id}
                className="px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg border border-amber-200 disabled:opacity-30 ml-2 shrink-0"
              >
                แก้ไข
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-center w-16">ID</th>
                <th className="px-6 py-4 font-semibold">
                  ชื่อผู้ใช้ (Username)
                </th>
                <th className="px-6 py-4 font-semibold">ชื่อ - นามสกุล</th>
                <th className="px-6 py-4 font-semibold text-center">
                  ระดับผู้ใช้งาน
                </th>
                <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
                <th className="px-6 py-4 font-semibold text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <>
                  {[1, 2, 3, 4, 5].map((item) => (
                    <tr key={`sk-${item}`}>
                      <td className="px-6 py-4">
                        <Skeleton className="h-5 w-16" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-5 w-32" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-5 w-24" />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Skeleton className="h-6 w-20 mx-auto rounded-full" />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Skeleton className="h-6 w-20 mx-auto rounded-full" />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Skeleton className="h-7 w-12 mx-auto" />
                      </td>
                    </tr>
                  ))}
                </>
              )}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              )}
              {filteredUsers.map((u) => (
                <tr
                  key={u.user_id}
                  className={clsx(
                    "hover:bg-slate-50 transition-colors",
                    !u.is_active && "opacity-70",
                  )}
                >
                  <td className="px-6 py-4 text-center text-slate-500">
                    #{u.user_id}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {u.username}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-800">{u.full_name}</div>
                    {u.driver && (
                      <div className="text-xs text-blue-600">
                        พขร. ID: #{u.driver.driver_id}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge isActive={u.is_active} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => openEdit(u)}
                      disabled={currentUser?.user_id === u.user_id}
                      className="px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded border border-amber-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      แก้ไข
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 text-sm text-slate-500">
          แสดง {filteredUsers.length} รายการ
        </div>
      </div>

      {showModal && editing && (
        <Modal title="แก้ไขระดับผู้ใช้งาน" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
              <p className="text-sm font-medium text-slate-800">
                {editing.full_name}
              </p>
              <p className="text-xs text-slate-500">@{editing.username}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
                ระดับผู้ใช้งาน
              </label>
              <select
                {...register("role")}
                className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="DRIVER">ผู้ขับรถ (Driver)</option>
                <option value="EXECUTIVE">ผู้บริหาร (Executive)</option>
                <option value="ADMIN">ผู้ดูแลระบบ (Admin)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
                สถานะระบบ
              </label>
              <select
                {...register("is_active")}
                className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="true">ใช้งานได้ปกติ</option>
                <option value="false">ระงับการใช้งาน</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#8A1ABA] text-white rounded-lg text-sm font-medium hover:bg-[#72159c]"
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
