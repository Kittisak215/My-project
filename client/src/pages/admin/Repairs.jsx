import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";
import {
  Search,
  X,
  ExternalLink,
  ImageOff,
  Wrench,
  AlertCircle,
  Paperclip,
} from "lucide-react";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import { useForm, Controller } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import clsx from "clsx";
import Skeleton from "../../components/Skeleton";
import { formatPhone } from "../../utils/format";

const statusMap = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  COMPLETED: "bg-green-100 text-green-700 border-green-200",
  AWAITING_APPROVAL: "bg-purple-100 text-purple-700 border-purple-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
};
const statusLabel = {
  PENDING: "📝 รอตรวจสอบ",
  IN_PROGRESS: "🔧 กำลังดำเนินการ",
  COMPLETED: "✅ ซ่อมเสร็จสิ้น",
  AWAITING_APPROVAL: "⏳ รออนุมัติงบ",
  APPROVED: "✅ อนุมัติแล้ว",
  REJECTED: "❌ ไม่อนุมัติ",
};

const repairTypeMap = {
  GENERAL: {
    label: "ซ่อมทั่วไป",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  MAINTENANCE: {
    label: "บำรุงรักษาตามระยะ",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  EMERGENCY: {
    label: "ซ่อมฉุกเฉิน",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

const RepairTypeBadge = ({ type }) => {
  const info = repairTypeMap[type] || {
    label: type || "ซ่อมทั่วไป",
    cls: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span
      className={clsx(
        "text-xs px-2.5 py-0.5 rounded-full font-semibold border inline-block",
        info.cls,
      )}
    >
      {info.label}
    </span>
  );
};

const StatusBadge = ({ status }) => (
  <span
    className={clsx(
      "px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap",
      statusMap[status],
    )}
  >
    {statusLabel[status]}
  </span>
);

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
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

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d)) return "-";
  return d.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function RepairsPage() {
  const [repairs, setRepairs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [repairType, setRepairType] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [selectedDetailRepair, setSelectedDetailRepair] = useState(null);
  const [viewReceipt, setViewReceipt] = useState(null);
  const [garages, setGarages] = useState([]);
  const { register, handleSubmit, reset, watch, control, formState: { errors } } = useForm();
  const limit = 10;
  const watchStatus = watch("status");
  const watchPartsCost = watch("parts_cost");
  const watchLaborCost = watch("labor_cost");
  const watchRepairStartDate = watch("repair_start_date");
  const liveTotalCost = (parseFloat(watchPartsCost) || 0) + (parseFloat(watchLaborCost) || 0);

  const fetchAll = useCallback(async () => {
    try {
      const [rRes, gRes] = await Promise.all([
        api.get("/repairs", { params: { search, status, repair_type: repairType || undefined, page, limit } }),
        api.get("/garages", { params: { limit: 100 } }),
      ]);
      setRepairs(rRes.data.data);
      setTotal(rRes.data.total);
      setGarages(gRes.data.data);
    } catch {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [search, status, repairType, page, limit]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const location = useLocation();
  const locationStateHandled = useRef(false);

  const openStatusModal = useCallback((r) => {
    setSelectedRepair(r);
    const pCost = r.parts_cost != null ? r.parts_cost : (r.total_cost != null && r.labor_cost == null ? r.total_cost : "");
    const lCost = r.labor_cost != null ? r.labor_cost : "";
    reset({
      status: r.status,
      note: r.note,
      garage_id: r.garage_id,
      parts_cost: pCost,
      labor_cost: lCost,
      total_cost: r.total_cost ?? "",
      estimated_cost: r.estimated_cost,
      repair_start_date: r.repair_start_date
        ? r.repair_start_date.slice(0, 10)
        : "",
      estimated_end_date: r.estimated_end_date
        ? r.estimated_end_date.slice(0, 10)
        : "",
      repair_end_date: r.repair_end_date ? r.repair_end_date.slice(0, 10) : "",
      oil_grade: r.oil_grade || "",
      is_tire_changed: r.is_tire_changed ? "true" : "",
    });
    setShowStatusModal(true);
  }, [reset]);

  useEffect(() => {
    if (location.state?.openRequestId && !locationStateHandled.current) {
      locationStateHandled.current = true;
      // Fetch the specific request to guarantee we have it, even if not on the current page
      api.get(`/repairs/${location.state.openRequestId}`).then(res => {
         if (res.data) openStatusModal(res.data);
      }).catch(() => toast.error("ไม่พบข้อมูลคำร้องซ่อมนี้"));
      
      // Clean up the state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location, openStatusModal]);

  const openDetailModal = (r) => {
    setSelectedDetailRepair(r);
    setShowDetailModal(true);
  };

  const onStatusSubmit = async (data) => {
    try {
      if (data.repair_start_date && data.repair_end_date) {
        if (new Date(data.repair_end_date) < new Date(data.repair_start_date)) {
          toast.error("วันที่ซ่อมเสร็จจริงต้องไม่เกิดขึ้นก่อนวันที่เข้าซ่อม");
          return;
        }
      }
      const pCost = data.parts_cost !== "" && data.parts_cost !== null && !isNaN(data.parts_cost) ? parseFloat(data.parts_cost) : null;
      const lCost = data.labor_cost !== "" && data.labor_cost !== null && !isNaN(data.labor_cost) ? parseFloat(data.labor_cost) : null;
      if (pCost !== null && pCost < 0) {
        toast.error("ค่าอะไหล่ต้องไม่ติดลบ");
        return;
      }
      if (lCost !== null && lCost < 0) {
        toast.error("ค่าแรงช่างต้องไม่ติดลบ");
        return;
      }
      const computedTotal = (pCost !== null || lCost !== null) ? ((pCost || 0) + (lCost || 0)) : (data.total_cost ? parseFloat(data.total_cost) : null);
      const payload = {
        ...data,
        parts_cost: pCost,
        labor_cost: lCost,
        total_cost: computedTotal,
      };
      await api.patch(`/repairs/${selectedRepair.request_id}/status`, payload);
      toast.success("อัปเดตสถานะสำเร็จ");
      setShowStatusModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("ยืนยันการลบ?")) return;
    try {
      await api.delete(`/repairs/${id}`);
      toast.success("ลบสำเร็จ");
      fetchAll();
    } catch {
      toast.error("ลบไม่สำเร็จ");
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center bg-white p-4 rounded-xl shadow-sm mb-4 md:mb-6 gap-3 border border-slate-100">
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full">
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
              placeholder="ค้นหาเลขที่, ทะเบียนรถ..."
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-violet-500 w-full sm:w-56"
            />
          </div>
          <select
            value={repairType}
            onChange={(e) => {
              setRepairType(e.target.value);
              setPage(1);
            }}
            className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-violet-500 bg-white"
          >
            <option value="">ประเภททั้งหมด</option>
            <option value="GENERAL">ซ่อมทั่วไป</option>
            <option value="EMERGENCY">ซ่อมฉุกเฉิน</option>
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-violet-500 bg-white"
          >
            <option value="">สถานะทั้งหมด</option>
            <option value="PENDING">📝 รอตรวจสอบ</option>
            <option value="AWAITING_APPROVAL">⏳ รออนุมัติงบ</option>
            <option value="APPROVED">✅ อนุมัติแล้ว</option>
            <option value="REJECTED">❌ ไม่อนุมัติ</option>
            <option value="IN_PROGRESS">🔧 กำลังดำเนินการซ่อม</option>
            <option value="COMPLETED">🏁 ซ่อมเสร็จสิ้น</option>
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
            {!loading && repairs.length === 0 && (
              <p className="text-center py-8 text-slate-400">ไม่พบข้อมูล</p>
            )}
            {repairs.map((r) => (
              <div
                key={r.request_id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between mb-2">
                  <div
                    className="cursor-pointer group"
                    onClick={() => openDetailModal(r)}
                  >
                    <span className="font-semibold text-blue-600 text-sm group-hover:underline">
                      REQ-{String(r.request_id).padStart(4, "0")}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">
                      {formatDate(r.created_at)}
                    </span>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <p className="font-semibold text-slate-800">
                    {r.vehicle?.license_plate}
                  </p>
                  <RepairTypeBadge type={r.repair_type} />
                </div>
                <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                  {r.issue_description}
                </p>
                {r.garage && (
                  <p className="text-xs text-slate-500 mb-1">
                    📍 {r.garage.garage_name}
                  </p>
                )}
                {r.repair_start_date && (
                  <p className="text-xs text-slate-500 mb-1">
                    📅 {formatDate(r.repair_start_date)}
                    {r.estimated_end_date &&
                      ` → ${formatDate(r.estimated_end_date)}`}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500 space-y-0.5">
                    {r.estimated_cost && (
                      <p>
                        ประเมิน:{" "}
                        <span className="font-semibold text-amber-700">
                          {parseFloat(r.estimated_cost).toLocaleString(
                            "th-TH",
                            { minimumFractionDigits: 2 },
                          )}{" "}
                          บ.
                        </span>
                      </p>
                    )}
                    {r.total_cost && (
                      <div>
                        <p>
                          จริง:{" "}
                          <span className="font-semibold text-slate-700">
                            {parseFloat(r.total_cost).toLocaleString("th-TH", {
                              minimumFractionDigits: 2,
                            })}{" "}
                            บ.
                          </span>
                        </p>
                        {(r.parts_cost || r.labor_cost) && (
                          <p className="text-[10px] text-slate-400">
                            (อะไหล่: ฿{parseFloat(r.parts_cost || 0).toLocaleString()} | ค่าแรง: ฿{parseFloat(r.labor_cost || 0).toLocaleString()})
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 w-full">
                    {r.status === "COMPLETED" || r.status === "REJECTED" ? (
                      <button
                        onClick={() => openDetailModal(r)}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                      >
                        ดูรายละเอียด
                      </button>
                    ) : (
                      <button
                        onClick={() => openStatusModal(r)}
                        className="w-full px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                      >
                        {r.status === "PENDING"
                          ? "ตรวจสอบคำร้อง"
                          : "อัปเดตสถานะ"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 whitespace-nowrap">
                  <tr>
                    <th className="px-4 py-4 font-semibold text-center">
                      เลขที่ / วันที่
                    </th>
                    <th className="px-4 py-4 font-semibold">ทะเบียนรถ</th>
                    <th className="px-4 py-4 font-semibold">ผู้แจ้ง</th>
                    <th className="px-4 py-4 font-semibold w-48">
                      อาการเบื้องต้น
                    </th>
                    <th className="px-4 py-4 font-semibold">
                      อู่ / วันที่ซ่อม
                    </th>
                    <th className="px-4 py-4 font-semibold text-right">
                      ประเมิน / จ่ายจริง
                    </th>
                    <th className="px-4 py-4 font-semibold text-center">
                      สถานะ
                    </th>
                    <th className="px-4 py-4 font-semibold text-center">
                      จัดการ
                    </th>
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
                            <Skeleton className="h-5 w-20" />
                          </td>
                          <td className="px-6 py-4">
                            <Skeleton className="h-5 w-24 mb-1" />
                            <Skeleton className="h-3 w-16" />
                          </td>
                          <td className="px-6 py-4">
                            <Skeleton className="h-5 w-32" />
                          </td>
                          <td className="px-6 py-4">
                            <Skeleton className="h-5 w-20" />
                          </td>
                          <td className="px-6 py-4">
                            <Skeleton className="h-5 w-24" />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Skeleton className="h-6 w-20 mx-auto rounded-full" />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Skeleton className="h-7 w-20 mx-auto" />
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                  {!loading && repairs.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-8 text-slate-400"
                      >
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  )}
                  {repairs.map((r) => (
                    <tr
                      key={r.request_id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-4 text-center">
                        <div
                          className="cursor-pointer group inline-block"
                          onClick={() => openDetailModal(r)}
                        >
                          <div className="font-semibold text-blue-600 group-hover:underline">
                            REQ-{String(r.request_id).padStart(4, "0")}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatDate(r.created_at)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-800">
                          {r.vehicle?.license_plate}
                        </div>
                        <div className="text-xs text-slate-500">
                          ไมล์: {(r.mileage_at_repair || 0).toLocaleString()}{" "}
                          กม.
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {r.driver?.full_name || "-"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="mb-1">
                          <RepairTypeBadge type={r.repair_type} />
                        </div>
                        <div className="text-slate-800 text-xs truncate max-w-[180px]">
                          {r.issue_description}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {r.garage ? (
                          <>
                            <div className="text-slate-800 text-xs font-semibold">
                              {r.garage.garage_name}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {formatPhone(r.garage.phone)}
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            - รอระบุอู่ -
                          </span>
                        )}
                        {r.repair_start_date && (
                          <div className="text-xs text-slate-500 mt-1">
                            {formatDate(r.repair_start_date)}
                            {r.estimated_end_date && (
                              <span> → {formatDate(r.estimated_end_date)}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {r.estimated_cost && (
                          <div className="text-xs text-amber-700 font-semibold">
                            ประเมิน:{" "}
                            {parseFloat(r.estimated_cost).toLocaleString(
                              "th-TH",
                              { minimumFractionDigits: 2 },
                            )}
                          </div>
                        )}
                        {r.total_cost ? (
                          <div>
                            <div className="font-semibold text-slate-800 text-sm">
                              {parseFloat(r.total_cost).toLocaleString("th-TH", {
                                minimumFractionDigits: 2,
                              })}
                            </div>
                            {(r.parts_cost || r.labor_cost) && (
                              <div className="text-[11px] text-slate-500 whitespace-nowrap mt-0.5">
                                อะไหล่: ฿{parseFloat(r.parts_cost || 0).toLocaleString()} | ค่าแรง: ฿{parseFloat(r.labor_cost || 0).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          !r.estimated_cost && (
                            <span className="text-slate-400 text-xs">-</span>
                          )
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          {r.status === "COMPLETED" || r.status === "REJECTED" ? (
                            <button
                              type="button"
                              onClick={() => openDetailModal(r)}
                              className="w-full max-w-[120px] px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all cursor-pointer"
                            >
                              ดูรายละเอียด
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openStatusModal(r)}
                              className="w-full max-w-[120px] px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all cursor-pointer"
                            >
                              อัปเดตสถานะ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm">
              <span className="text-slate-500">
                แสดง {repairs.length} จากทั้งหมด {total} รายการ
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

          {/* Status Update Modal */}
          {showStatusModal && selectedRepair && (
            <Modal
              title={
                selectedRepair.status === "AWAITING_APPROVAL"
                  ? `พิจารณาอนุมัติงบ: REQ-${String(selectedRepair.request_id).padStart(4, "0")}`
                  : `อัปเดตสถานะ: REQ-${String(selectedRepair.request_id).padStart(4, "0")}`
              }
              onClose={() => setShowStatusModal(false)}
            >
              <div className="bg-slate-50 p-3 rounded-xl mb-3 text-sm border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800">
                    {selectedRepair.vehicle?.license_plate}
                  </p>
                  <RepairTypeBadge type={selectedRepair.repair_type} />
                </div>
                <p className="text-slate-600 text-xs mt-1">
                  <span className="font-semibold text-slate-500">ปัญหา:</span> {selectedRepair.issue_description}
                </p>
                {selectedRepair.estimated_cost && (
                  <p className="text-amber-800 font-semibold text-xs mt-1.5 bg-amber-50 px-2 py-1 rounded border border-amber-200/60 inline-block">
                    ยอดประเมิน/ขออนุมัติ: ฿{parseFloat(selectedRepair.estimated_cost).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
                  </p>
                )}
              </div>

              {selectedRepair.receipt_image && (
                <div className="flex items-center justify-between p-2.5 mb-3 bg-purple-50 rounded-xl border border-purple-100 text-xs">
                  <span className="font-medium text-purple-900 flex items-center gap-1.5">
                    <Paperclip size={14} className="text-[#8A1ABA]" /> มีใบเสร็จ/หลักฐานแนบมา
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewReceipt(selectedRepair.receipt_image)}
                    className="font-bold text-[#8A1ABA] hover:underline cursor-pointer"
                  >
                    คลิกดูรูปภาพบิล
                  </button>
                </div>
              )}

              <form
                onSubmit={handleSubmit(onStatusSubmit)}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    สถานะ
                  </label>
                  <select
                    {...register("status", { required: true })}
                    className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 bg-white"
                  >
                    <option value="PENDING">📝 รอตรวจสอบ</option>
                    <option value="AWAITING_APPROVAL">⏳ รออนุมัติงบ</option>
                    <option value="APPROVED">✅ อนุมัติ (ดำเนินการซ่อมได้)</option>
                    <option value="REJECTED">❌ ไม่อนุมัติ</option>
                    <option value="IN_PROGRESS">🔧 กำลังดำเนินการซ่อม</option>
                    <option value="COMPLETED">🏁 ซ่อมเสร็จสิ้น</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    อู่ที่ดำเนินการ
                  </label>
                  <select
                    {...register("garage_id")}
                    className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                  >
                    <option value="">
                      -- อู่นอก / อื่นๆ (ดูจากใบเสร็จ) --
                    </option>
                    {garages.map((g) => (
                      <option key={g.garage_id} value={g.garage_id}>
                        {g.garage_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      วันที่เข้าซ่อม
                    </label>
                    <Controller
                      control={control}
                      name="repair_start_date"
                      render={({ field }) => (
                        <DatePicker
                          selected={field.value ? new Date(field.value) : null}
                          onChange={(date) =>
                            field.onChange(
                              date ? date.toLocaleDateString("en-CA") : "",
                            )
                          }
                          dateFormat="dd/MM/yyyy"
                          placeholderText="วว/ดด/ปปปป"
                          className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 text-slate-800 bg-white"
                        />
                      )}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      วันที่คาดว่าจะเสร็จ
                    </label>
                    <Controller
                      control={control}
                      name="estimated_end_date"
                      render={({ field }) => (
                        <DatePicker
                          selected={field.value ? new Date(field.value) : null}
                          onChange={(date) =>
                            field.onChange(
                              date ? date.toLocaleDateString("en-CA") : "",
                            )
                          }
                          dateFormat="dd/MM/yyyy"
                          placeholderText="วว/ดด/ปปปป"
                          className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 text-slate-800 bg-white"
                        />
                      )}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    ราคาประเมิน (บาท)
                  </label>
                  <input
                    {...register("estimated_cost", {
                      valueAsNumber: true,
                      min: { value: 0, message: "ราคาประเมินต้องไม่ติดลบ" },
                    })}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                    className={clsx(
                      "mt-1 block w-full border rounded-lg px-3 py-2 text-sm focus:outline-none",
                      errors.estimated_cost ? "border-red-500 focus:border-red-500" : "border-slate-300 focus:border-violet-500"
                    )}
                  />
                  {errors.estimated_cost && <p className="text-xs text-red-500 mt-1">{errors.estimated_cost.message}</p>}
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      แจกแจงค่าใช้จ่ายจริง
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      คำนวณรวมอัตโนมัติ
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">
                        ค่าอะไหล่ (บาท)
                      </label>
                      <input
                        {...register("parts_cost", {
                          valueAsNumber: true,
                          min: { value: 0, message: "ค่าอะไหล่ต้องไม่ติดลบ" },
                        })}
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                        className={clsx(
                          "block w-full bg-white border rounded-lg px-3 py-2 text-sm focus:outline-none font-medium",
                          errors.parts_cost ? "border-red-500 focus:border-red-500" : "border-slate-300 focus:border-violet-500"
                        )}
                      />
                      {errors.parts_cost && <p className="text-xs text-red-500 mt-1">{errors.parts_cost.message}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">
                        ค่าแรงช่าง (บาท)
                      </label>
                      <input
                        {...register("labor_cost", {
                          valueAsNumber: true,
                          min: { value: 0, message: "ค่าแรงช่างต้องไม่ติดลบ" },
                        })}
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                        className={clsx(
                          "block w-full bg-white border rounded-lg px-3 py-2 text-sm focus:outline-none font-medium",
                          errors.labor_cost ? "border-red-500 focus:border-red-500" : "border-slate-300 focus:border-violet-500"
                        )}
                      />
                      {errors.labor_cost && <p className="text-xs text-red-500 mt-1">{errors.labor_cost.message}</p>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-sm">
                    <span className="font-medium text-slate-700">รวมค่าใช้จ่ายจริงทั้งหมด:</span>
                    <span className="font-bold text-violet-700 text-base">
                      {liveTotalCost.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    วันที่ซ่อมเสร็จจริง
                  </label>
                  <Controller
                    control={control}
                    name="repair_end_date"
                    render={({ field }) => (
                      <DatePicker
                        selected={field.value ? new Date(field.value) : null}
                        onChange={(date) =>
                          field.onChange(
                            date ? date.toLocaleDateString("en-CA") : "",
                          )
                        }
                        minDate={watchRepairStartDate ? new Date(watchRepairStartDate) : null}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="วว/ดด/ปปปป"
                        className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 text-slate-800 bg-white"
                      />
                    )}
                  />
                </div>
                {/* Service Updates - แสดงเฉพาะเมื่อสถานะ = COMPLETED */}
                {watchStatus === "COMPLETED" && (
                  <div className="space-y-3">
                    {/* Oil Grade */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <label className="text-sm font-semibold text-slate-800 flex items-center justify-between">
                        <span>การเปลี่ยนถ่ายน้ำมันเครื่อง</span>
                        <span className="text-xs font-normal text-slate-500">
                          เพื่อคำนวณรอบถัดไป
                        </span>
                      </label>
                      <select
                        {...register("oil_grade")}
                        className="mt-2 block w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 bg-white text-slate-700"
                      >
                        <option value="">
                          — ไม่ระบุ / ไม่ได้เปลี่ยนน้ำมันเครื่อง —
                        </option>
                        <option value="MINERAL">
                          เกรดธรรมดา (Mineral) - เปลี่ยนอีกที {(selectedRepair?.vehicle?.vehicleType?.oil_interval_mineral_km ?? 5000).toLocaleString()} กม.
                        </option>
                        <option value="SEMI_SYNTHETIC">
                          กึ่งสังเคราะห์ (Semi-Synthetic) - เปลี่ยนอีกที {(selectedRepair?.vehicle?.vehicleType?.oil_interval_semi_synthetic_km ?? 7000).toLocaleString()} กม.
                        </option>
                        <option value="FULLY_SYNTHETIC">
                          สังเคราะห์แท้ (Fully Synthetic) - เปลี่ยนอีกที {(selectedRepair?.vehicle?.vehicleType?.oil_interval_fully_synthetic_km ?? 10000).toLocaleString()} กม.
                        </option>
                      </select>
                    </div>

                    {/* Tire Change */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <label className="text-sm font-semibold text-slate-800 flex items-center justify-between">
                        <span>การเปลี่ยนยางรถยนต์</span>
                        <span className="text-xs font-normal text-slate-500">
                          เพื่อคำนวณรอบถัดไป
                        </span>
                      </label>
                      <select
                        {...register("is_tire_changed")}
                        className="mt-2 block w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 bg-white text-slate-700"
                      >
                        <option value="">— ไม่ระบุ / ไม่ได้เปลี่ยนยาง —</option>
                        <option value="false_emergency">
                          เปลี่ยนบางเส้น/ฉุกเฉิน (ไม่รีเซ็ตรอบ)
                        </option>
                        <option value="true">
                          เปลี่ยนใหม่ 4 เส้น (รีเซ็ตรอบ {(selectedRepair?.vehicle?.vehicleType?.tire_change_interval_km ?? 50000).toLocaleString()} กม. ใหม่)
                        </option>
                      </select>
                    </div>
                  </div>
                )}
                {/* Receipt Image in Edit Modal */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-700">
                      รูปภาพหลักฐาน / ใบเสร็จ
                    </p>
                  </div>
                  {selectedRepair?.receipt_image ? (
                    <button type="button" onClick={() => setViewReceipt(selectedRepair.receipt_image)} className="w-full relative group block">
                      <img
                        src={selectedRepair.receipt_image}
                        alt="ใบเสร็จ/หลักฐาน"
                        className="w-full max-h-64 object-contain rounded border bg-white cursor-pointer group-hover:opacity-90 transition-opacity shadow-sm"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg font-medium backdrop-blur-sm shadow-sm flex items-center gap-1">
                          <Search size={14} /> คลิกเพื่อดูรูปเต็ม
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2 bg-white rounded-lg border border-dashed">
                      <ImageOff size={24} />
                      <p className="text-xs">ยังไม่มีการแนบสลิป</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    หมายเหตุ
                  </label>
                  <textarea
                    {...register("note")}
                    rows={3}
                    className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  {selectedRepair?.status === "PENDING" ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleDelete(selectedRepair.request_id);
                        setShowStatusModal(false);
                      }}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 border border-red-200 transition-colors"
                    >
                      ลบคำร้อง
                    </button>
                  ) : (
                    <div></div>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowStatusModal(false)}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
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
                </div>
              </form>
            </Modal>
          )}

          {/* Detail Modal */}
          {showDetailModal && selectedDetailRepair && (
            <Modal
              title={`รายละเอียดการส่งซ่อม: REQ-${String(selectedDetailRepair.request_id).padStart(4, "0")}`}
              onClose={() => setShowDetailModal(false)}
            >
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border">
                  <span className="text-slate-500 font-medium">
                    สถานะคำร้อง
                  </span>
                  <StatusBadge status={selectedDetailRepair.status} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border">
                    <p className="text-xs text-slate-400">ทะเบียนรถ</p>
                    <p className="font-semibold text-slate-800">
                      {selectedDetailRepair.vehicle?.license_plate || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border">
                    <p className="text-xs text-slate-400">เลขไมล์ขณะส่งซ่อม</p>
                    <p className="font-semibold text-slate-800">
                      {(
                        selectedDetailRepair.mileage_at_repair || 0
                      ).toLocaleString()}{" "}
                      กม.
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border">
                  <p className="text-xs text-slate-400">ผู้แจ้งซ่อม</p>
                  <p className="font-medium text-slate-800">
                    {selectedDetailRepair.driver?.full_name || "-"}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border">
                  <p className="text-xs text-slate-400 mb-1">
                    ประเภทการซ่อม / อาการแจ้งซ่อม
                  </p>
                  <RepairTypeBadge type={selectedDetailRepair.repair_type} />
                  <p className="text-slate-800 mt-1">
                    {selectedDetailRepair.issue_description}
                  </p>
                </div>

                {/* Garage & Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border">
                    <p className="text-xs text-slate-400">อู่ซ่อมบำรุง</p>
                    <p className="font-medium text-slate-800">
                      {selectedDetailRepair.garage?.garage_name || "ยังไม่ระบุ"}
                    </p>
                    {selectedDetailRepair.garage?.phone && (
                      <p className="text-xs text-slate-400 font-mono">
                        {formatPhone(selectedDetailRepair.garage.phone)}
                      </p>
                    )}
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border">
                    <p className="text-xs text-slate-400">ระยะเวลาซ่อม</p>
                    <p className="text-xs text-slate-700">
                      เข้าซ่อม:{" "}
                      <span className="font-semibold">
                        {formatDate(selectedDetailRepair.repair_start_date)}
                      </span>
                    </p>
                    <p className="text-xs text-slate-700">
                      คาดเสร็จ:{" "}
                      <span className="font-semibold">
                        {formatDate(selectedDetailRepair.estimated_end_date)}
                      </span>
                    </p>
                    {selectedDetailRepair.repair_end_date && (
                      <p className="text-xs text-emerald-700">
                        เสร็จจริง:{" "}
                        <span className="font-semibold">
                          {formatDate(selectedDetailRepair.repair_end_date)}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Costs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border">
                    <p className="text-xs text-slate-500">ราคาประเมิน</p>
                    <p className="font-semibold text-slate-700">
                      {selectedDetailRepair.estimated_cost
                        ? `${parseFloat(selectedDetailRepair.estimated_cost).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท`
                        : "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border">
                    <p className="text-xs text-slate-500">ค่าใช้จ่ายรวม</p>
                    <p className="font-semibold text-blue-600">
                      {selectedDetailRepair.total_cost
                        ? `${parseFloat(selectedDetailRepair.total_cost).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท`
                        : "-"}
                    </p>
                    {(selectedDetailRepair.parts_cost || selectedDetailRepair.labor_cost) && (
                      <div className="text-[11px] text-slate-500 mt-1 space-x-2">
                        <span>อะไหล่: ฿{parseFloat(selectedDetailRepair.parts_cost || 0).toLocaleString()}</span>
                        <span>•</span>
                        <span>ค่าแรง: ฿{parseFloat(selectedDetailRepair.labor_cost || 0).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedDetailRepair.repair_detail && (
                  <div className="bg-slate-50 p-3 rounded-lg border">
                    <p className="text-xs text-slate-400">
                      รายการซ่อมบำรุงเพิ่มเติม
                    </p>
                    <p className="text-slate-700 mt-1">
                      {selectedDetailRepair.repair_detail}
                    </p>
                  </div>
                )}
                {selectedDetailRepair.oil_grade && (
                  <div className="bg-slate-50 p-3 rounded-lg border">
                    <p className="text-xs text-slate-400">
                      เกรดน้ำมันเครื่องที่ใช้
                    </p>
                    <p className="text-slate-700 mt-1">
                      {selectedDetailRepair.oil_grade === "MINERAL" &&
                        `ธรรมดา (Mineral) — ${(selectedDetailRepair?.vehicle?.vehicleType?.oil_interval_mineral_km ?? 5000).toLocaleString()} กม.`}
                      {selectedDetailRepair.oil_grade === "SEMI_SYNTHETIC" &&
                        `กึ่งสังเคราะห์ (Semi-Synthetic) — ${(selectedDetailRepair?.vehicle?.vehicleType?.oil_interval_semi_synthetic_km ?? 7000).toLocaleString()} กม.`}
                      {selectedDetailRepair.oil_grade === "FULLY_SYNTHETIC" &&
                        `สังเคราะห์แท้ (Fully Synthetic) — ${(selectedDetailRepair?.vehicle?.vehicleType?.oil_interval_fully_synthetic_km ?? 10000).toLocaleString()} กม.`}
                    </p>
                  </div>
                )}
                {selectedDetailRepair.is_tire_changed && (
                  <div className="bg-slate-50 p-3 rounded-lg border">
                    <p className="text-xs text-slate-400">
                      การเปลี่ยนยางรถยนต์
                    </p>
                    <p className="text-slate-700 mt-1">
                      เปลี่ยนใหม่ 4 เส้น (รีเซ็ตรอบ {(selectedDetailRepair?.vehicle?.vehicleType?.tire_change_interval_km ?? 50000).toLocaleString()} กม. ใหม่)
                    </p>
                  </div>
                )}
                {selectedDetailRepair.note && (
                  <div className="bg-slate-50 p-3 rounded-lg border">
                    <p className="text-xs text-slate-400">หมายเหตุจากแอดมิน</p>
                    <p className="text-slate-700 mt-1">
                      {selectedDetailRepair.note}
                    </p>
                  </div>
                )}
                <div className="bg-slate-50 p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-400">
                      รูปภาพหลักฐาน / ใบเสร็จ
                    </p>
                  </div>
                  {selectedDetailRepair.receipt_image ? (
                    <button type="button" onClick={() => setViewReceipt(selectedDetailRepair.receipt_image)} className="w-full relative group block">
                      <img
                        src={selectedDetailRepair.receipt_image}
                        alt="ใบเสร็จ/หลักฐาน"
                        className="w-full max-h-64 object-contain rounded border bg-white cursor-pointer group-hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg font-medium backdrop-blur-sm shadow-sm flex items-center gap-1">
                          <Search size={14} /> คลิกเพื่อดูรูปเต็ม
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                      <ImageOff size={28} />
                      <p className="text-xs">ไม่มีรูปภาพหลักฐาน / ใบเสร็จ</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end items-center gap-2 pt-3 border-t">
                  {selectedDetailRepair?.status === "AWAITING_APPROVAL" && (
                    <button
                      type="button"
                      onClick={() => {
                        const item = selectedDetailRepair;
                        setShowDetailModal(false);
                        openStatusModal(item);
                      }}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    >
                      พิจารณาอนุมัติงบ / อัปเดตสถานะ
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 cursor-pointer"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </Modal>
          )}

      {/* Receipt Image Modal */}
      {viewReceipt && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200" onClick={() => setViewReceipt(null)}>
          <div className="relative max-w-3xl w-full flex flex-col items-center animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewReceipt(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-colors cursor-pointer"
            >
              <X size={24} />
            </button>
            <img src={viewReceipt} alt="Receipt" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
