import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Search, X, ImageOff, Paperclip } from "lucide-react";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import { useForm, Controller } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import clsx from "clsx";
import Skeleton from "../../components/Skeleton";
import StatusBadge from "../../components/StatusBadge";
import Modal from "../../components/Modal";
import { formatPhone } from "../../utils/format";

const repairTypeMap = {
  GENERAL: { label: "ซ่อมทั่วไป", cls: "bg-slate-100 text-slate-700 border-slate-200/80" },
  MAINTENANCE: { label: "บำรุงรักษาตามระยะ", cls: "bg-emerald-50 text-emerald-700 border-emerald-200/80" },
  EMERGENCY: { label: "ซ่อมฉุกเฉิน", cls: "bg-red-50 text-red-700 border-red-200/80" },
};

const RepairTypeBadge = ({ type }) => {
  const info = repairTypeMap[type] || {
    label: type || "ซ่อมทั่วไป",
    cls: "bg-slate-100 text-slate-700 border-slate-200/80",
  };
  return (
    <span className={clsx("text-[11px] px-2 py-0.5 rounded-md font-medium border inline-block", info.cls)}>
      {info.label}
    </span>
  );
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d)) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
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

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm();
  const limit = 10;
  const watchStatus = watch("status");
  const watchPartsCost = watch("parts_cost");
  const watchLaborCost = watch("labor_cost");
  const watchRepairStartDate = watch("repair_start_date");
  const liveTotalCost = (parseFloat(watchPartsCost) || 0) + (parseFloat(watchLaborCost) || 0);

  const fetchAll = useCallback(async () => {
    try {
      const [rRes, gRes] = await Promise.all([
        api.get("/repairs", {
          params: { search, status, repair_type: repairType || undefined, page, limit },
        }),
        api.get("/garages", { params: { limit: 100 } }),
      ]);
      setRepairs(rRes.data.data || []);
      setTotal(rRes.data.total || 0);
      setGarages(gRes.data.data || []);
    } catch {
      toast.error("โหลดข้อมูลคำร้องซ่อมไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [search, status, repairType, page]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const location = useLocation();
  const locationStateHandled = useRef(false);

  const openStatusModal = useCallback(
    (r) => {
      setSelectedRepair(r);
      const pCost =
        r.parts_cost != null
          ? r.parts_cost
          : r.total_cost != null && r.labor_cost == null
            ? r.total_cost
            : "";
      const lCost = r.labor_cost != null ? r.labor_cost : "";
      reset({
        status: r.status,
        note: r.note,
        garage_id: r.garage_id || "",
        parts_cost: pCost,
        labor_cost: lCost,
        total_cost: r.total_cost ?? "",
        estimated_cost: r.estimated_cost,
        repair_start_date: r.repair_start_date ? r.repair_start_date.slice(0, 10) : "",
        estimated_end_date: r.estimated_end_date ? r.estimated_end_date.slice(0, 10) : "",
        repair_end_date: r.repair_end_date ? r.repair_end_date.slice(0, 10) : "",
        oil_grade: r.oil_grade || "",
        is_tire_changed: r.is_tire_changed ? "true" : "",
      });
      setShowStatusModal(true);
    },
    [reset],
  );

  useEffect(() => {
    if (location.state?.openRequestId && !locationStateHandled.current) {
      locationStateHandled.current = true;
      api
        .get(`/repairs/${location.state.openRequestId}`)
        .then((res) => {
          if (res.data) openStatusModal(res.data);
        })
        .catch(() => toast.error("ไม่พบข้อมูลคำร้องซ่อมนี้"));
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
      const pCost =
        data.parts_cost !== "" && data.parts_cost !== null && !isNaN(data.parts_cost)
          ? parseFloat(data.parts_cost)
          : null;
      const lCost =
        data.labor_cost !== "" && data.labor_cost !== null && !isNaN(data.labor_cost)
          ? parseFloat(data.labor_cost)
          : null;
      if (pCost !== null && pCost < 0) {
        toast.error("ค่าอะไหล่ต้องไม่ติดลบ");
        return;
      }
      if (lCost !== null && lCost < 0) {
        toast.error("ค่าแรงช่างต้องไม่ติดลบ");
        return;
      }
      const computedTotal =
        pCost !== null || lCost !== null
          ? (pCost || 0) + (lCost || 0)
          : data.total_cost
            ? parseFloat(data.total_cost)
            : null;
      await api.patch(`/repairs/${selectedRepair.request_id}/status`, {
        ...data,
        parts_cost: pCost,
        labor_cost: lCost,
        total_cost: computedTotal,
      });
      toast.success("อัปเดตสถานะคำร้องแล้ว");
      setShowStatusModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("ยืนยันการลบคำร้องซ่อมนี้?")) return;
    try {
      await api.delete(`/repairs/${id}`);
      toast.success("ลบคำร้องแล้ว");
      fetchAll();
    } catch {
      toast.error("ลบคำร้องไม่สำเร็จ");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-10">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          จัดการคำร้องซ่อม
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          ตรวจสอบ อนุมัติงบประมาณ อัปเดตสถานะซ่อม และบันทึกค่าใช้จ่าย ({total.toLocaleString("th-TH")} รายการ)
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <label htmlFor="repair-search" className="sr-only">
            ค้นหาเลขที่หรือทะเบียนรถ
          </label>
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="repair-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="ค้นหาเลขที่, ทะเบียนรถ…"
            autoComplete="off"
            spellCheck={false}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] transition-colors"
          />
        </div>
        <select
          aria-label="กรองตามประเภทการซ่อม"
          value={repairType}
          onChange={(e) => {
            setRepairType(e.target.value);
            setPage(1);
          }}
          className="px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] transition-colors"
        >
          <option value="">ประเภททั้งหมด</option>
          <option value="GENERAL">ซ่อมทั่วไป</option>
          <option value="EMERGENCY">ซ่อมฉุกเฉิน</option>
        </select>
        <select
          aria-label="กรองตามสถานะคำร้อง"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] transition-colors"
        >
          <option value="">สถานะทั้งหมด</option>
          <option value="PENDING">รอตรวจสอบ</option>
          <option value="AWAITING_APPROVAL">รออนุมัติงบ</option>
          <option value="APPROVED">อนุมัติแล้ว</option>
          <option value="REJECTED">ไม่อนุมัติ</option>
          <option value="IN_PROGRESS">กำลังดำเนินการซ่อม</option>
          <option value="COMPLETED">ซ่อมเสร็จสิ้น</option>
        </select>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading && (
          <>
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </>
        )}
        {!loading && repairs.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/90 py-12 text-center text-slate-400 text-sm">
            ไม่พบข้อมูลคำร้องซ่อม
          </div>
        )}
        {!loading &&
          repairs.map((r) => (
            <div
              key={r.request_id}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => openDetailModal(r)}
                  className="text-left group cursor-pointer"
                >
                  <span className="font-semibold text-[#8A1ABA] text-sm group-hover:underline tabular-nums">
                    REQ-{String(r.request_id).padStart(4, "0")}
                  </span>
                  <span className="text-xs text-slate-400 ml-2">{formatDate(r.created_at)}</span>
                </button>
                <StatusBadge status={r.status} />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-900">{r.vehicle?.license_plate}</span>
                <RepairTypeBadge type={r.repair_type} />
              </div>

              <p className="text-xs text-slate-600 line-clamp-2">{r.issue_description}</p>

              {(r.estimated_cost || r.total_cost) && (
                <div className="flex items-center gap-3 text-xs pt-1 tabular-nums">
                  {r.estimated_cost && (
                    <span className="text-amber-700">
                      ประเมิน ฿{parseFloat(r.estimated_cost).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                  {r.total_cost && (
                    <span className="font-semibold text-slate-900">
                      จริง ฿{parseFloat(r.total_cost).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100">
                {r.status === "COMPLETED" || r.status === "REJECTED" ? (
                  <button
                    type="button"
                    onClick={() => openDetailModal(r)}
                    className="w-full py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer"
                  >
                    ดูรายละเอียด
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openStatusModal(r)}
                    className="w-full py-2 text-xs font-medium text-[#8A1ABA] bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200/70 cursor-pointer"
                  >
                    {r.status === "PENDING" ? "ตรวจสอบคำร้อง" : "อัปเดตสถานะ"}
                  </button>
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
              <tr className="bg-slate-50/80 text-slate-500 text-xs font-medium border-b border-slate-200/80 whitespace-nowrap">
                <th className="px-5 py-3.5">เลขที่ / วันที่</th>
                <th className="px-4 py-3.5">ทะเบียนรถ / ผู้แจ้ง</th>
                <th className="px-4 py-3.5">ประเภท / อาการ</th>
                <th className="px-4 py-3.5">อู่ / วันที่ซ่อม</th>
                <th className="px-4 py-3.5 text-right">ประเมิน / จ่ายจริง</th>
                <th className="px-4 py-3.5 text-center">สถานะ</th>
                <th className="px-5 py-3.5 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading &&
                [1, 2, 3, 4, 5].map((item) => (
                  <tr key={`sk-${item}`}>
                    <td colSpan={7} className="px-5 py-4">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))}
              {!loading && repairs.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    ไม่พบข้อมูลคำร้องซ่อม
                  </td>
                </tr>
              )}
              {!loading &&
                repairs.map((r) => (
                  <tr key={r.request_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openDetailModal(r)}
                        className="text-left group cursor-pointer focus-visible:outline-none focus-visible:underline"
                      >
                        <div className="font-semibold text-[#8A1ABA] group-hover:underline tabular-nums">
                          REQ-{String(r.request_id).padStart(4, "0")}
                        </div>
                        <div className="text-xs text-slate-400 tabular-nums">
                          {formatDate(r.created_at)}
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">
                        {r.vehicle?.license_plate}
                      </div>
                      <div className="text-xs text-slate-500">
                        {r.driver?.full_name || "-"} • {(r.mileage_at_repair || 0).toLocaleString("th-TH")} กม.
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <RepairTypeBadge type={r.repair_type} />
                      <div className="text-slate-700 text-xs truncate max-w-[200px] mt-1">
                        {r.issue_description}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {r.garage ? (
                        <div className="text-xs font-medium text-slate-800">
                          {r.garage.garage_name}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">รอระบุอู่</span>
                      )}
                      {r.repair_start_date && (
                        <div className="text-xs text-slate-400 mt-0.5 tabular-nums">
                          {formatDate(r.repair_start_date)}
                          {r.estimated_end_date && ` – ${formatDate(r.estimated_end_date)}`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap">
                      {r.estimated_cost && (
                        <div className="text-xs text-amber-700">
                          ประเมิน ฿{parseFloat(r.estimated_cost).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </div>
                      )}
                      {r.total_cost ? (
                        <div className="font-semibold text-slate-900">
                          ฿{parseFloat(r.total_cost).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </div>
                      ) : (
                        !r.estimated_cost && <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {r.status === "COMPLETED" || r.status === "REJECTED" ? (
                        <button
                          type="button"
                          onClick={() => openDetailModal(r)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          รายละเอียด
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openStatusModal(r)}
                          className="px-3 py-1.5 text-xs font-medium text-[#8A1ABA] bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200/70 transition-colors cursor-pointer"
                        >
                          อัปเดตสถานะ
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span className="tabular-nums">
            แสดง {repairs.length} จากทั้งหมด {total.toLocaleString("th-TH")} รายการ
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 disabled:opacity-40 cursor-pointer"
            >
              ก่อนหน้า
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 disabled:opacity-40 cursor-pointer"
            >
              ถัดไป
            </button>
          </div>
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
          maxWidth="max-w-xl"
        >
          <div className="bg-slate-50 p-3.5 rounded-xl mb-4 text-sm border border-slate-200/80">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">
                {selectedRepair.vehicle?.license_plate}
              </p>
              <RepairTypeBadge type={selectedRepair.repair_type} />
            </div>
            <p className="text-slate-600 text-xs mt-1.5">{selectedRepair.issue_description}</p>
            {selectedRepair.estimated_cost && (
              <p className="text-amber-800 font-semibold text-xs mt-2 tabular-nums">
                ยอดประเมิน/ขออนุมัติ: ฿
                {parseFloat(selectedRepair.estimated_cost).toLocaleString("th-TH", {
                  minimumFractionDigits: 2,
                })}
              </p>
            )}
          </div>

          {selectedRepair.receipt_image && (
            <div className="flex items-center justify-between p-3 mb-4 bg-purple-50/70 rounded-xl border border-purple-200/70 text-xs">
              <span className="font-medium text-slate-800 flex items-center gap-1.5">
                <Paperclip size={14} className="text-[#8A1ABA]" aria-hidden="true" />
                มีใบเสร็จ/หลักฐานแนบมา
              </span>
              <button
                type="button"
                onClick={() => setViewReceipt(selectedRepair.receipt_image)}
                className="font-semibold text-[#8A1ABA] hover:underline cursor-pointer"
              >
                ดูรูปภาพบิล
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit(onStatusSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="r-status" className="block text-sm font-medium text-slate-700 mb-1">
                  สถานะ
                </label>
                <select
                  id="r-status"
                  {...register("status", { required: true })}
                  className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                >
                  <option value="PENDING">รอตรวจสอบ</option>
                  <option value="AWAITING_APPROVAL">รออนุมัติงบ</option>
                  <option value="APPROVED">อนุมัติ (ดำเนินการซ่อมได้)</option>
                  <option value="REJECTED">ไม่อนุมัติ</option>
                  <option value="IN_PROGRESS">กำลังดำเนินการซ่อม</option>
                  <option value="COMPLETED">ซ่อมเสร็จสิ้น</option>
                </select>
              </div>
              <div>
                <label htmlFor="r-garage" className="block text-sm font-medium text-slate-700 mb-1">
                  อู่ที่ดำเนินการ
                </label>
                <select
                  id="r-garage"
                  {...register("garage_id")}
                  className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                >
                  <option value="">อู่นอก / อื่นๆ (ดูจากใบเสร็จ)</option>
                  {garages.map((g) => (
                    <option key={g.garage_id} value={g.garage_id}>
                      {g.garage_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">วันที่เข้าซ่อม</label>
                <Controller
                  control={control}
                  name="repair_start_date"
                  render={({ field }) => (
                    <DatePicker
                      selected={field.value ? new Date(field.value) : null}
                      onChange={(date) =>
                        field.onChange(date ? date.toLocaleDateString("en-CA") : "")
                      }
                      dateFormat="dd/MM/yyyy"
                      placeholderText="วว/ดด/ปปปป"
                      className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                    />
                  )}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">คาดว่าจะเสร็จ</label>
                <Controller
                  control={control}
                  name="estimated_end_date"
                  render={({ field }) => (
                    <DatePicker
                      selected={field.value ? new Date(field.value) : null}
                      onChange={(date) =>
                        field.onChange(date ? date.toLocaleDateString("en-CA") : "")
                      }
                      dateFormat="dd/MM/yyyy"
                      placeholderText="วว/ดด/ปปปป"
                      className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                    />
                  )}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">เสร็จจริง</label>
                <Controller
                  control={control}
                  name="repair_end_date"
                  render={({ field }) => (
                    <DatePicker
                      selected={field.value ? new Date(field.value) : null}
                      onChange={(date) =>
                        field.onChange(date ? date.toLocaleDateString("en-CA") : "")
                      }
                      minDate={watchRepairStartDate ? new Date(watchRepairStartDate) : null}
                      dateFormat="dd/MM/yyyy"
                      placeholderText="วว/ดด/ปปปป"
                      className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                    />
                  )}
                />
              </div>
            </div>

            <div>
              <label htmlFor="r-est" className="block text-sm font-medium text-slate-700 mb-1">
                ราคาประเมิน (บาท)
              </label>
              <input
                id="r-est"
                {...register("estimated_cost", {
                  valueAsNumber: true,
                  min: { value: 0, message: "ราคาประเมินต้องไม่ติดลบ" },
                })}
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                className="block w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
              />
              {errors.estimated_cost && (
                <p className="text-xs text-red-600 mt-1">{errors.estimated_cost.message}</p>
              )}
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">ค่าใช้จ่ายจริง</span>
                <span className="text-slate-400">คำนวณรวมอัตโนมัติ</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="r-parts" className="text-xs font-medium text-slate-600 block mb-1">
                    ค่าอะไหล่ (บาท)
                  </label>
                  <input
                    id="r-parts"
                    {...register("parts_cost", {
                      valueAsNumber: true,
                      min: { value: 0, message: "ต้องไม่ติดลบ" },
                    })}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                    className="block w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                  />
                </div>
                <div>
                  <label htmlFor="r-labor" className="text-xs font-medium text-slate-600 block mb-1">
                    ค่าแรงช่าง (บาท)
                  </label>
                  <input
                    id="r-labor"
                    {...register("labor_cost", {
                      valueAsNumber: true,
                      min: { value: 0, message: "ต้องไม่ติดลบ" },
                    })}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                    className="block w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-sm">
                <span className="font-medium text-slate-700">รวมค่าใช้จ่ายจริง</span>
                <span className="font-bold text-[#8A1ABA] tabular-nums">
                  ฿{liveTotalCost.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {watchStatus === "COMPLETED" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                <div>
                  <label htmlFor="r-oil" className="block text-xs font-semibold text-slate-800 mb-1">
                    เปลี่ยนถ่ายน้ำมันเครื่อง
                  </label>
                  <select
                    id="r-oil"
                    {...register("oil_grade")}
                    className="block w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                  >
                    <option value="">ไม่ได้เปลี่ยนน้ำมันเครื่อง</option>
                    <option value="MINERAL">
                      ธรรมดา ({(selectedRepair?.vehicle?.vehicleType?.oil_interval_mineral_km ?? 5000).toLocaleString()} กม.)
                    </option>
                    <option value="SEMI_SYNTHETIC">
                      กึ่งสังเคราะห์ ({(selectedRepair?.vehicle?.vehicleType?.oil_interval_semi_synthetic_km ?? 7000).toLocaleString()} กม.)
                    </option>
                    <option value="FULLY_SYNTHETIC">
                      สังเคราะห์แท้ ({(selectedRepair?.vehicle?.vehicleType?.oil_interval_fully_synthetic_km ?? 10000).toLocaleString()} กม.)
                    </option>
                  </select>
                </div>
                <div>
                  <label htmlFor="r-tire" className="block text-xs font-semibold text-slate-800 mb-1">
                    เปลี่ยนยางรถยนต์
                  </label>
                  <select
                    id="r-tire"
                    {...register("is_tire_changed")}
                    className="block w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
                  >
                    <option value="">ไม่ได้เปลี่ยนยาง</option>
                    <option value="false_emergency">เปลี่ยนบางเส้น/ฉุกเฉิน (ไม่รีเซ็ตรอบ)</option>
                    <option value="true">
                      เปลี่ยนใหม่ 4 เส้น (รีเซ็ต {(selectedRepair?.vehicle?.vehicleType?.tire_change_interval_km ?? 50000).toLocaleString()} กม.)
                    </option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="r-note" className="block text-sm font-medium text-slate-700 mb-1">
                หมายเหตุ
              </label>
              <textarea
                id="r-note"
                {...register("note")}
                rows={2}
                className="block w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              {selectedRepair?.status === "PENDING" ? (
                <button
                  type="button"
                  onClick={() => {
                    handleDelete(selectedRepair.request_id);
                    setShowStatusModal(false);
                  }}
                  className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-medium hover:bg-red-100 border border-red-200/80 cursor-pointer"
                >
                  ลบคำร้อง
                </button>
              ) : (
                <div />
              )}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
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
            </div>
          </form>
        </Modal>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedDetailRepair && (
        <Modal
          title={`รายละเอียดคำร้อง: REQ-${String(selectedDetailRepair.request_id).padStart(4, "0")}`}
          onClose={() => setShowDetailModal(false)}
          maxWidth="max-w-xl"
        >
          <div className="space-y-3.5 text-sm">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 text-xs font-medium">สถานะคำร้อง</span>
              <StatusBadge status={selectedDetailRepair.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <p className="text-xs text-slate-400">ทะเบียนรถ</p>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {selectedDetailRepair.vehicle?.license_plate || "-"}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <p className="text-xs text-slate-400">เลขไมล์ขณะส่งซ่อม</p>
                <p className="font-semibold text-slate-900 mt-0.5 tabular-nums">
                  {(selectedDetailRepair.mileage_at_repair || 0).toLocaleString("th-TH")} กม.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-400">ผู้แจ้ง: {selectedDetailRepair.driver?.full_name || "-"}</p>
                <RepairTypeBadge type={selectedDetailRepair.repair_type} />
              </div>
              <p className="text-slate-800">{selectedDetailRepair.issue_description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <p className="text-xs text-slate-400">อู่ซ่อมบำรุง</p>
                <p className="font-medium text-slate-900 mt-0.5">
                  {selectedDetailRepair.garage?.garage_name || "ยังไม่ระบุ"}
                </p>
                {selectedDetailRepair.garage?.phone && (
                  <p className="text-xs text-slate-500 tabular-nums">
                    {formatPhone(selectedDetailRepair.garage.phone)}
                  </p>
                )}
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1 tabular-nums">
                <p className="text-slate-400">ระยะเวลาซ่อม</p>
                <p className="text-slate-700">เข้าซ่อม: {formatDate(selectedDetailRepair.repair_start_date)}</p>
                <p className="text-slate-700">คาดเสร็จ: {formatDate(selectedDetailRepair.estimated_end_date)}</p>
                {selectedDetailRepair.repair_end_date && (
                  <p className="text-emerald-700 font-medium">
                    เสร็จจริง: {formatDate(selectedDetailRepair.repair_end_date)}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 tabular-nums">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <p className="text-xs text-slate-400">ราคาประเมิน</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {selectedDetailRepair.estimated_cost
                    ? `฿${parseFloat(selectedDetailRepair.estimated_cost).toLocaleString("th-TH", { minimumFractionDigits: 2 })}`
                    : "-"}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <p className="text-xs text-slate-400">ค่าใช้จ่ายจริง</p>
                <p className="font-semibold text-[#8A1ABA] mt-0.5">
                  {selectedDetailRepair.total_cost
                    ? `฿${parseFloat(selectedDetailRepair.total_cost).toLocaleString("th-TH", { minimumFractionDigits: 2 })}`
                    : "-"}
                </p>
                {(selectedDetailRepair.parts_cost || selectedDetailRepair.labor_cost) && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    อะไหล่ ฿{parseFloat(selectedDetailRepair.parts_cost || 0).toLocaleString("th-TH")} • ค่าแรง ฿{parseFloat(selectedDetailRepair.labor_cost || 0).toLocaleString("th-TH")}
                  </p>
                )}
              </div>
            </div>

            {selectedDetailRepair.note && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <p className="text-xs text-slate-400">หมายเหตุ</p>
                <p className="text-slate-700 mt-0.5">{selectedDetailRepair.note}</p>
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <p className="text-xs text-slate-400 mb-2">รูปภาพหลักฐาน / ใบเสร็จ</p>
              {selectedDetailRepair.receipt_image ? (
                <button
                  type="button"
                  onClick={() => setViewReceipt(selectedDetailRepair.receipt_image)}
                  className="w-full relative group block cursor-pointer"
                >
                  <img
                    src={selectedDetailRepair.receipt_image}
                    alt="ใบเสร็จและหลักฐานการซ่อม"
                    className="w-full max-h-56 object-contain rounded-lg border border-slate-200 bg-white"
                  />
                </button>
              ) : (
                <div className="flex flex-col items-center py-5 text-slate-400 gap-1.5">
                  <ImageOff size={22} aria-hidden="true" />
                  <p className="text-xs">ไม่มีรูปภาพหลักฐาน</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              {selectedDetailRepair.status === "AWAITING_APPROVAL" && (
                <button
                  type="button"
                  onClick={() => {
                    const item = selectedDetailRepair;
                    setShowDetailModal(false);
                    openStatusModal(item);
                  }}
                  className="px-4 py-2 bg-[#8A1ABA] hover:bg-[#73149c] text-white rounded-xl text-sm font-medium cursor-pointer"
                >
                  พิจารณาอนุมัติงบ
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Receipt Lightbox */}
      {viewReceipt && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setViewReceipt(null)}
          role="dialog"
          aria-modal="true"
          aria-label="ภาพใบเสร็จขนาดเต็ม"
        >
          <div className="relative max-w-3xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setViewReceipt(null)}
              aria-label="ปิดภาพใบเสร็จ"
              className="absolute -top-11 right-0 p-2 text-white/80 hover:text-white bg-black/40 rounded-full cursor-pointer"
            >
              <X size={22} aria-hidden="true" />
            </button>
            <img
              src={viewReceipt}
              alt="ใบเสร็จขนาดเต็ม"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
