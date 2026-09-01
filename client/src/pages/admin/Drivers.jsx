import { useEffect, useState } from "react";
import { Search, X, Copy, CheckCheck, Trash2 } from "lucide-react";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import clsx from "clsx";
import Skeleton from "../../components/Skeleton";

const StatusBadge = ({ isActive }) => (
  <span
    className={clsx(
      "px-2.5 py-1 rounded-full text-xs font-medium",
      isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600",
    )}
  >
    {isActive ? "🟢 ปฏิบัติงาน" : "⚫ พ้นสภาพ"}
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

// กล่องแสดงข้อมูลบัญชีหลังสร้างสำเร็จ
const CredentialCard = ({ username, password, onClose }) => {
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const copy = async (text, type) => {
    await navigator.clipboard.writeText(text);
    if (type === "user") {
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">
              ✅
            </div>
            <div>
              <p className="font-semibold text-slate-800">
                เพิ่มผู้รับผิดชอบสำเร็จ!
              </p>
              <p className="text-xs text-slate-500">
                กรุณาแจ้งข้อมูลล็อกอินแก่คนขับ
              </p>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">ชื่อผู้ใช้งาน</p>
                <p className="font-semibold text-slate-800 tracking-wide">
                  {username}
                </p>
              </div>
              <button
                onClick={() => copy(username, "user")}
                className="p-2 rounded-lg hover:bg-slate-200 transition-colors text-slate-500"
              >
                {copiedUser ? (
                  <CheckCheck size={16} className="text-green-600" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>
            <div className="border-t border-slate-200" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">รหัสผ่าน</p>
                <p className="font-semibold text-slate-800 tracking-wider">
                  {password}
                </p>
              </div>
              <button
                onClick={() => copy(password, "pass")}
                className="p-2 rounded-lg hover:bg-slate-200 transition-colors text-slate-500"
              >
                {copiedPass ? (
                  <CheckCheck size={16} className="text-green-600" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-amber-600 mt-3 text-center">
            ⚠️ โปรดจดหรือคัดลอกรหัสผ่านไว้ก่อนปิด
          </p>
          <button
            onClick={onClose}
            className="mt-4 w-full py-2.5 bg-[#8A1ABA] text-white rounded-lg text-sm font-medium hover:bg-[#72159c]"
          >
            รับทราบ และปิด
          </button>
        </div>
      </div>
    </div>
  );
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [credential, setCredential] = useState(null); // สำหรับแสดงกล่องรหัสผ่าน
  const { register, handleSubmit, reset, watch } = useForm();
  const limit = 10;
  const watchPhone = watch("phone", "");

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const params = { search, page, limit };
      if (status !== "") params.is_active = status === "true";
      const res = await api.get("/drivers", { params });
      setDrivers(res.data.data);
      setTotal(res.data.total);
    } catch {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDrivers();
  }, [search, status, page]);

  const openCreate = () => {
    setEditing(null);
    reset({ is_active: "true" });
    setShowModal(true);
  };
  const openEdit = (d) => {
    setEditing(d);
    reset({
      full_name: d.full_name,
      phone: d.phone,
      email: d.userAccount?.email || "",
      is_active: d.is_active ? "true" : "false",
    });
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    if (
      window.confirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลของ "${name}" ถาวร?\n(หมายเหตุ: การลบนี้จะไม่สามารถเรียกคืนได้ และทำได้เฉพาะบัญชีที่ไม่มีข้อมูลผูกมัด)`,
      )
    ) {
      try {
        await api.delete(`/drivers/${id}/hard`);
        toast.success("ลบข้อมูลคนขับถาวรสำเร็จ");
        fetchDrivers();
      } catch (err) {
        toast.error(
          err.response?.data?.message || "เกิดข้อผิดพลาดในการลบข้อมูล",
        );
      }
    }
  };

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, is_active: data.is_active === "true" };
      if (editing) {
        await api.put(`/drivers/${editing.driver_id}`, payload);
        toast.success("แก้ไขสำเร็จ");
        setShowModal(false);
        fetchDrivers();
      } else {
        const res = await api.post("/drivers", payload);
        setShowModal(false);
        fetchDrivers();
        // แสดงกล่องรหัสผ่าน
        const savedUsername = data.username || data.phone;
        const savedPassword = res.data.defaultPassword;
        setCredential({ username: savedUsername, password: savedPassword });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* กล่องแสดงข้อมูลบัญชีหลังสร้างสำเร็จ */}
      {credential && (
        <CredentialCard
          username={credential.username}
          password={credential.password}
          onClose={() => setCredential(null)}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center bg-white p-4 rounded-xl shadow-sm mb-4 md:mb-6 gap-3 border border-slate-100">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="ค้นหาชื่อ, เบอร์โทร..."
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-full sm:w-56"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">สถานะทั้งหมด</option>
            <option value="true">ปฏิบัติงาน</option>
            <option value="false">พ้นสภาพ</option>
          </select>
        </div>
        <button
          onClick={openCreate}
          className="bg-[#8A1ABA] hover:bg-[#72159c] text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 w-full md:w-auto"
        >
          + เพิ่มผู้รับผิดชอบ
        </button>
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
        {!loading && drivers.length === 0 && (
          <p className="text-center py-8 text-slate-400">ไม่พบข้อมูล</p>
        )}
        {!loading &&
          drivers.map((d) => (
            <div
              key={d.driver_id}
              className={clsx(
                "bg-white rounded-xl border border-slate-200 p-4 shadow-sm",
                !d.is_active && "opacity-70",
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-400">
                      #{d.driver_id}
                    </span>
                    <StatusBadge isActive={d.is_active} />
                  </div>
                  <p className="font-semibold text-slate-800">{d.full_name}</p>
                  <p className="text-sm text-slate-500">{d.phone}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    ผูกบัญชี: {d.userAccount?.username || "-"}
                  </p>
                  <span className="bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs font-medium mt-2 inline-block">
                    {d.vehicles?.length || 0} คัน
                  </span>
                </div>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <button
                    onClick={() => openEdit(d)}
                    className="px-3.5 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg border border-amber-200"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(d.driver_id, d.full_name)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200"
                    title="ลบถาวร"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
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
                <th className="px-6 py-4 font-semibold text-center w-16">
                  รหัส
                </th>
                <th className="px-6 py-4 font-semibold">ชื่อ - นามสกุล</th>
                <th className="px-6 py-4 font-semibold">เบอร์โทรศัพท์</th>
                <th className="px-6 py-4 font-semibold text-center">จำนวนรถ</th>
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
                        <Skeleton className="h-6 w-12 mx-auto" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-5 w-24" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-6 w-16 mx-auto rounded-full" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-6 w-20 mx-auto rounded-full" />
                      </td>
                      <td className="px-6 py-4 flex justify-center gap-1">
                        <Skeleton className="h-7 w-12" />
                        <Skeleton className="h-7 w-12" />
                      </td>
                    </tr>
                  ))}
                </>
              )}
              {!loading && drivers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              )}
              {!loading &&
                drivers.map((d) => (
                  <tr
                    key={d.driver_id}
                    className={clsx(
                      "hover:bg-slate-50 transition-colors",
                      !d.is_active && "opacity-70",
                    )}
                  >
                    <td className="px-6 py-4 text-center text-slate-500">
                      #{d.driver_id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">
                        {d.full_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        ผูกบัญชี: {d.userAccount?.username || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{d.phone}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-blue-100 text-blue-700 py-1 px-3 rounded-full text-xs font-medium">
                        {d.vehicles?.length || 0} คัน
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge isActive={d.is_active} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => openEdit(d)}
                        className="px-3.5 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded border border-amber-200"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(d.driver_id, d.full_name)}
                        className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded border border-red-200 ml-1"
                      >
                        ลบทิ้ง
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm">
          <span className="text-slate-500">
            แสดง {drivers.length} จากทั้งหมด {total} รายการ
          </span>
          <div className="flex space-x-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 border rounded bg-white disabled:opacity-50"
            >
              ก่อนหน้า
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 border rounded bg-white disabled:opacity-50"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Pagination */}
      <div className="md:hidden flex items-center justify-between text-sm mt-2 px-1">
        <span className="text-slate-500">{total} รายการ</span>
        <div className="flex space-x-1">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border rounded bg-white disabled:opacity-50 text-sm"
          >
            ก่อนหน้า
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded bg-white disabled:opacity-50 text-sm"
          >
            ถัดไป
          </button>
        </div>
      </div>

      {showModal && (
        <Modal
          title={editing ? "แก้ไขผู้รับผิดชอบ" : "เพิ่มผู้รับผิดชอบ"}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  ชื่อ - นามสกุล *
                </label>
                <input
                  {...register("full_name", { required: true })}
                  className="block w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-[#8A1ABA]/10 focus:border-[#8A1ABA] transition-all bg-slate-50/50 hover:bg-slate-50 focus:bg-white placeholder-slate-300"
                  placeholder="เช่น สมชาย ใจดี"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  เบอร์โทรศัพท์ *
                </label>
                <input
                  {...register("phone", { required: true })}
                  className="block w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-[#8A1ABA]/10 focus:border-[#8A1ABA] transition-all bg-slate-50/50 hover:bg-slate-50 focus:bg-white placeholder-slate-300"
                  placeholder="08X-XXX-XXXX"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block flex items-center gap-1.5">
                  อีเมล <span className="text-slate-400 font-normal text-xs">(ไม่บังคับ)</span>
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className="block w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-[#8A1ABA]/10 focus:border-[#8A1ABA] transition-all bg-slate-50/50 hover:bg-slate-50 focus:bg-white placeholder-slate-300"
                  placeholder="example@mail.com"
                />
              </div>
            </div>

            {/* ส่วนบัญชีล็อกอิน — แสดงเฉพาะตอนสร้างใหม่ */}
            {!editing && (
              <div className="border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/30 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="flex items-center gap-2 mb-4 relative z-10">
                  <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                  <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
                    ข้อมูลบัญชีล็อกอิน
                  </p>
                </div>
                
                <div className="space-y-4 relative z-10">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                      Username{" "}
                      <span className="text-slate-400 font-normal text-xs">
                        (เว้นว่างเพื่อใช้เบอร์โทรเป็น Username)
                      </span>
                    </label>
                    <input
                      {...register("username")}
                      placeholder={watchPhone || "เบอร์โทรศัพท์"}
                      className="block w-full border border-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all bg-white/70 hover:bg-white shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                      รหัสผ่าน{" "}
                      <span className="text-slate-400 font-normal text-xs">
                        (เว้นว่างเพื่อใช้เบอร์โทรเป็นรหัสผ่านตั้งต้น)
                      </span>
                    </label>
                    <input
                      {...register("password")}
                      type="text"
                      placeholder={watchPhone || "เบอร์โทรศัพท์"}
                      className="block w-full border border-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all bg-white/70 hover:bg-white shadow-sm"
                    />
                  </div>
                </div>
                <div className="flex items-start gap-2 mt-4 pt-3 border-t border-indigo-100/50">
                   <span className="text-amber-500 text-sm">💡</span>
                   <p className="text-[11px] text-slate-500 leading-tight">
                     <span className="font-semibold text-slate-600">คำแนะนำ:</span> เพื่อความปลอดภัย แนะนำให้พนักงานเปลี่ยนรหัสผ่านด้วยตนเอง หลังจากล็อกอินเข้าสู่ระบบครั้งแรก
                   </p>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                สถานะการทำงาน
              </label>
              <select
                {...register("is_active")}
                className="block w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-[#8A1ABA]/10 focus:border-[#8A1ABA] transition-all bg-white cursor-pointer"
              >
                <option value="true">🟢 ปฏิบัติงาน (พร้อมขับขี่)</option>
                <option value="false">
                  ⚫ พ้นสภาพ (ปลดรถและระงับบัญชีอัตโนมัติ)
                </option>
              </select>
            </div>
            
            <div className="flex justify-end gap-3 pt-5 mt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-[#8A1ABA] to-[#631085] text-white rounded-xl text-sm font-medium shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {editing ? "บันทึกการแก้ไข" : "เพิ่มผู้รับผิดชอบ"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
