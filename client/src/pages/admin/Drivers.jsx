import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Search,
  Copy,
  CheckCheck,
  Trash2,
  Eye,
  EyeOff,
  Car,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import clsx from "clsx";
import Skeleton from "../../components/Skeleton";
import Modal from "../../components/Modal";
import { formatPhone } from "../../utils/format";

const DriverStatusPill = ({ isActive }) => (
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
    {isActive ? "ปฏิบัติงาน" : "พ้นสภาพ"}
  </span>
);

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
    <Modal title="สร้างบัญชีผู้รับผิดชอบสำเร็จ" onClose={onClose} maxWidth="max-w-sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200/70 rounded-xl text-emerald-800">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" aria-hidden="true" />
          <p className="text-xs leading-relaxed">
            กรุณาคัดลอกและแจ้งข้อมูลเข้าสู่ระบบให้พนักงานขับรถก่อนปิดหน้าต่างนี้
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-slate-400">ชื่อผู้ใช้งาน</p>
              <p className="font-semibold text-slate-900 truncate mt-0.5">{username}</p>
            </div>
            <button
              type="button"
              onClick={() => copy(username, "user")}
              aria-label="คัดลอกชื่อผู้ใช้งาน"
              className="p-2 rounded-lg hover:bg-slate-200/70 transition-colors text-slate-500 cursor-pointer"
            >
              {copiedUser ? (
                <CheckCheck size={16} className="text-emerald-600" aria-hidden="true" />
              ) : (
                <Copy size={16} aria-hidden="true" />
              )}
            </button>
          </div>
          <div className="border-t border-slate-200" />
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-slate-400">รหัสผ่านตั้งต้น</p>
              <p className="font-semibold text-slate-900 truncate mt-0.5">{password}</p>
            </div>
            <button
              type="button"
              onClick={() => copy(password, "pass")}
              aria-label="คัดลอกรหัสผ่าน"
              className="p-2 rounded-lg hover:bg-slate-200/70 transition-colors text-slate-500 cursor-pointer"
            >
              {copiedPass ? (
                <CheckCheck size={16} className="text-emerald-600" aria-hidden="true" />
              ) : (
                <Copy size={16} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-[#8A1ABA] hover:bg-[#73149c] text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
        >
          รับทราบและปิด
        </button>
      </div>
    </Modal>
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
  const [credential, setCredential] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedDriverVehicles, setSelectedDriverVehicles] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const limit = 10;
  const watchPhone = watch("phone", "");

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search, page, limit };
      if (status !== "") params.is_active = status === "true";
      const res = await api.get("/drivers", { params });
      setDrivers(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error("โหลดข้อมูลผู้รับผิดชอบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const openCreate = () => {
    setEditing(null);
    setShowPassword(false);
    reset({ full_name: "", phone: "", email: "", username: "", password: "", is_active: "true" });
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/drivers/${deleteTarget.driver_id}/hard`);
      toast.success("ลบข้อมูลคนขับถาวรแล้ว");
      setDeleteTarget(null);
      fetchDrivers();
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาดในการลบข้อมูล");
    }
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        full_name: data.full_name?.trim(),
        phone: data.phone?.trim(),
        email: data.email?.trim() || null,
        is_active: data.is_active === "true",
      };
      if (editing) {
        await api.put(`/drivers/${editing.driver_id}`, payload);
        toast.success("บันทึกการแก้ไขแล้ว");
        setShowModal(false);
        fetchDrivers();
      } else {
        const res = await api.post("/drivers", payload);
        setShowModal(false);
        fetchDrivers();
        setCredential({
          username: data.username || data.phone,
          password: res.data.defaultPassword,
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-10">
      {credential && (
        <CredentialCard
          username={credential.username}
          password={credential.password}
          onClose={() => setCredential(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            ผู้รับผิดชอบยานพาหนะ (พขร.)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            จัดการรายชื่อพนักงานขับรถ ข้อมูลติดต่อ และรถในความรับผิดชอบ ({total.toLocaleString("th-TH")} คน)
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#8A1ABA] hover:bg-[#73149c] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] focus-visible:ring-offset-2 cursor-pointer"
        >
          <Plus size={16} aria-hidden="true" />
          เพิ่มผู้รับผิดชอบ
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <label htmlFor="driver-search" className="sr-only">
            ค้นหาชื่อหรือเบอร์โทร
          </label>
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="driver-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="ค้นหาชื่อ, เบอร์โทร…"
            autoComplete="off"
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] transition-colors"
          />
        </div>
        <div>
          <label htmlFor="driver-status" className="sr-only">
            กรองตามสถานะ
          </label>
          <select
            id="driver-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-44 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] transition-colors"
          >
            <option value="">สถานะทั้งหมด</option>
            <option value="true">ปฏิบัติงาน</option>
            <option value="false">พ้นสภาพ</option>
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
        {!loading && drivers.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/90 py-12 text-center text-slate-400 text-sm">
            ไม่พบข้อมูลผู้รับผิดชอบ
          </div>
        )}
        {!loading &&
          drivers.map((d) => (
            <div
              key={d.driver_id}
              className={clsx(
                "bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3",
                !d.is_active && "opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{d.full_name}</p>
                    <DriverStatusPill isActive={d.is_active} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 tabular-nums">
                    {formatPhone(d.phone)} • บัญชี: {d.userAccount?.username || "-"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(d)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-[#8A1ABA] bg-slate-50 rounded-lg border border-slate-200 cursor-pointer"
                  >
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(d)}
                    aria-label={`ลบ ${d.full_name}`}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200/70 cursor-pointer"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">รถในความดูแล</span>
                {d.vehicles && d.vehicles.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSelectedDriverVehicles(d)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-[#8A1ABA] rounded-lg font-medium border border-purple-200/70 cursor-pointer"
                  >
                    <Car size={13} aria-hidden="true" />
                    {d.vehicles.length} คัน
                  </button>
                ) : (
                  <span className="text-slate-400">ไม่มีรถ</span>
                )}
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
                <th className="px-5 py-3.5">ชื่อ - นามสกุล</th>
                <th className="px-4 py-3.5">เบอร์โทรศัพท์</th>
                <th className="px-4 py-3.5 text-center">รถในความดูแล</th>
                <th className="px-4 py-3.5 text-center">สถานะ</th>
                <th className="px-5 py-3.5 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading &&
                [1, 2, 3, 4, 5].map((item) => (
                  <tr key={`sk-${item}`}>
                    <td colSpan={5} className="px-5 py-4">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))}
              {!loading && drivers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    ไม่พบข้อมูลผู้รับผิดชอบ
                  </td>
                </tr>
              )}
              {!loading &&
                drivers.map((d) => (
                  <tr
                    key={d.driver_id}
                    className={clsx(
                      "hover:bg-slate-50/70 transition-colors",
                      !d.is_active && "opacity-65",
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{d.full_name}</div>
                      <div className="text-xs text-slate-500">
                        บัญชี: {d.userAccount?.username || "-"} • #{d.driver_id}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 tabular-nums whitespace-nowrap">
                      {formatPhone(d.phone)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {d.vehicles && d.vehicles.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedDriverVehicles(d)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-[#8A1ABA] rounded-lg text-xs font-medium border border-purple-200/70 transition-colors cursor-pointer"
                        >
                          <Car size={13} aria-hidden="true" />
                          {d.vehicles.length} คัน
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">0 คัน</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <DriverStatusPill isActive={d.is_active} />
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(d)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-[#8A1ABA] bg-white hover:bg-purple-50 rounded-lg border border-slate-200 hover:border-purple-200 transition-colors cursor-pointer"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(d)}
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
            แสดง {drivers.length} จากทั้งหมด {total.toLocaleString("th-TH")} รายการ
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              ก่อนหน้า
            </button>
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

      {showModal && (
        <Modal
          title={editing ? "แก้ไขผู้รับผิดชอบ" : "เพิ่มผู้รับผิดชอบ"}
          onClose={() => {
            setShowModal(false);
            setShowPassword(false);
          }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="d-name" className="block text-sm font-medium text-slate-700 mb-1">
                ชื่อ - นามสกุล *
              </label>
              <input
                id="d-name"
                {...register("full_name", {
                  required: "กรุณาระบุชื่อ - นามสกุล",
                  maxLength: { value: 100, message: "ไม่เกิน 100 ตัวอักษร" },
                  validate: (v) => (v && v.trim().length > 0) || "ต้องไม่เป็นช่องว่าง",
                })}
                maxLength={100}
                placeholder="เช่น สมชาย ใจดี…"
                className={clsx(
                  "block w-full border rounded-xl px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]",
                  errors.full_name ? "border-red-500" : "border-slate-300",
                )}
              />
              {errors.full_name && (
                <p className="text-xs text-red-600 mt-1">{errors.full_name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="d-phone" className="block text-sm font-medium text-slate-700 mb-1">
                เบอร์โทรศัพท์ *
              </label>
              <input
                id="d-phone"
                type="tel"
                maxLength={10}
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/\D/g, "");
                }}
                {...register("phone", {
                  required: "กรุณาระบุเบอร์โทรศัพท์",
                  pattern: {
                    value: /^0[689]\d{8}$/,
                    message: "ต้องเป็นตัวเลข 10 หลัก (ขึ้นต้นด้วย 06, 08 หรือ 09)",
                  },
                })}
                placeholder="08XXXXXXXX…"
                className={clsx(
                  "block w-full border rounded-xl px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]",
                  errors.phone ? "border-red-500" : "border-slate-300",
                )}
              />
              {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label htmlFor="d-email" className="block text-sm font-medium text-slate-700 mb-1">
                อีเมล <span className="text-xs text-slate-400 font-normal">(ไม่บังคับ)</span>
              </label>
              <input
                id="d-email"
                type="email"
                spellCheck={false}
                {...register("email", {
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "รูปแบบอีเมลไม่ถูกต้อง",
                  },
                })}
                placeholder="example@mail.com…"
                className={clsx(
                  "block w-full border rounded-xl px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]",
                  errors.email ? "border-red-500" : "border-slate-300",
                )}
              />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
            </div>

            {!editing && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-800">ข้อมูลบัญชีเข้าสู่ระบบ</p>
                <div>
                  <label htmlFor="d-user" className="block text-xs font-medium text-slate-600 mb-1">
                    Username (เว้นว่างเพื่อใช้เบอร์โทร)
                  </label>
                  <input
                    id="d-user"
                    {...register("username")}
                    spellCheck={false}
                    placeholder={watchPhone || "เบอร์โทรศัพท์…"}
                    className="block w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                  />
                </div>
                <div>
                  <label htmlFor="d-pass" className="block text-xs font-medium text-slate-600 mb-1">
                    รหัสผ่าน (เว้นว่างเพื่อใช้เบอร์โทร)
                  </label>
                  <div className="relative">
                    <input
                      id="d-pass"
                      {...register("password")}
                      type={showPassword ? "text" : "password"}
                      placeholder={showPassword ? watchPhone || "เบอร์โทรศัพท์" : "ค่าเริ่มต้นคือเบอร์โทร…"}
                      className="block w-full bg-white border border-slate-300 rounded-xl pl-3 pr-10 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                      className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="d-active" className="block text-sm font-medium text-slate-700 mb-1">
                สถานะการทำงาน
              </label>
              <select
                id="d-active"
                {...register("is_active")}
                className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
              >
                <option value="true">ปฏิบัติงาน (พร้อมขับขี่)</option>
                <option value="false">พ้นสภาพ (ปลดรถและระงับบัญชีอัตโนมัติ)</option>
              </select>
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
                {editing ? "บันทึกการแก้ไข" : "เพิ่มผู้รับผิดชอบ"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {selectedDriverVehicles && (
        <Modal
          title={`รถในความดูแลของ ${selectedDriverVehicles.full_name}`}
          subtitle={`เบอร์โทร ${formatPhone(selectedDriverVehicles.phone)} • ทั้งหมด ${selectedDriverVehicles.vehicles?.length || 0} คัน`}
          onClose={() => setSelectedDriverVehicles(null)}
        >
          <div className="space-y-2.5">
            {selectedDriverVehicles.vehicles?.map((v, i) => (
              <div
                key={v.vehicle_id || i}
                className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/80"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">{v.license_plate}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {[v.brand, v.model].filter(Boolean).join(" ") || "-"}
                    {v.color && ` • สี${v.color}`}
                    {v.year && ` • ปี ${v.year}`}
                  </p>
                </div>
                <span
                  className={clsx(
                    "text-xs px-2.5 py-0.5 rounded-full font-medium border",
                    v.status === "ACTIVE" || v.status === "READY"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                      : "bg-amber-50 text-amber-700 border-amber-200/80",
                  )}
                >
                  {v.status === "ACTIVE" || v.status === "READY" ? "พร้อมใช้งาน" : "กำลังซ่อม"}
                </span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="ยืนยันการลบข้อมูลคนขับถาวร"
          onClose={() => setDeleteTarget(null)}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-red-50 rounded-xl text-red-700 border border-red-200/70">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-semibold text-slate-900">ต้องการลบข้อมูลคนขับนี้ถาวรใช่หรือไม่?</p>
                <p className="text-xs text-slate-600 mt-1">
                  {deleteTarget.full_name} ({formatPhone(deleteTarget.phone)})
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              ลบได้เฉพาะคนขับที่ไม่มีรถผูกมัดและยังไม่มีประวัติในระบบ หากมีประวัติแนะนำให้เปลี่ยนสถานะเป็น “พ้นสภาพ” แทน
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
