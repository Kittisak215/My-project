import { useEffect, useState } from "react";
import {
  Wrench,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Upload,
  Image as ImageIcon,
  X,
} from "lucide-react";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import Skeleton from "../../components/Skeleton";
import StatusBadge from "../../components/StatusBadge";
import { formatPhone } from "../../utils/format";

const repairTypeLabel = {
  GENERAL: "ซ่อมทั่วไป",
  EMERGENCY: "ซ่อมฉุกเฉิน",
  MAINTENANCE: "บำรุงรักษาตามระยะ",
};

export default function DriverHistoryPage() {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [viewReceipt, setViewReceipt] = useState(null);

  const fetchRepairs = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get("/repairs", { params: { page: p, limit: 10 } });
      setRepairs(res.data.data || []);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch {
      toast.error("โหลดข้อมูลประวัติไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepairs(1);
  }, []);

  const handleUploadReceipt = async (id, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("receipt", file);
    const loadingToast = toast.loading("กำลังอัปโหลดสลิป…");
    try {
      await api.post(`/repairs/${id}/receipt`, formData);
      toast.dismiss(loadingToast);
      toast.success("อัปโหลดสลิปเรียบร้อยแล้ว");
      fetchRepairs(page);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || "อัปโหลดสลิปไม่สำเร็จ");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
  };

  const isOverdueEst = (estimatedEndDate, status) => {
    if (!estimatedEndDate || status === "COMPLETED" || status === "REJECTED") return false;
    return new Date(estimatedEndDate) < new Date();
  };

  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            ประวัติการซ่อมบำรุง
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            ติดตามสถานะคำร้องซ่อมและแนบหลักฐานใบเสร็จ ({total.toLocaleString("th-TH")} รายการ)
          </p>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      )}

      {!loading && repairs.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/90">
          <Wrench size={36} className="mx-auto mb-2 text-slate-300" aria-hidden="true" />
          <p className="font-semibold text-slate-700 text-sm">ยังไม่มีประวัติการแจ้งซ่อม</p>
          <p className="text-xs text-slate-400 mt-1">คำร้องแจ้งซ่อมทั้งหมดของคุณจะแสดงที่นี่</p>
        </div>
      )}

      {!loading && repairs.length > 0 && (
        <div className="space-y-3.5">
          {repairs.map((r) => {
            const overdue = isOverdueEst(r.estimated_end_date, r.status);
            return (
              <article
                key={r.request_id || r.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-3.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={r.status} />
                      <span className="text-xs font-semibold text-[#8A1ABA] tabular-nums">
                        REQ-{String(r.request_id).padStart(4, "0")}
                      </span>
                      {r.repair_type && (
                        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {repairTypeLabel[r.repair_type] || r.repair_type}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 inline-flex items-center gap-1 tabular-nums">
                        <Calendar size={12} aria-hidden="true" />
                        {formatDate(r.created_at || r.createdAt)}
                      </span>
                    </div>

                    <h2 className="font-semibold text-slate-900 text-base">
                      {r.vehicle?.license_plate}{" "}
                      <span className="text-xs font-normal text-slate-500">
                        ({r.vehicle?.brand} {r.vehicle?.model})
                      </span>
                    </h2>

                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {r.issue_description}
                    </p>

                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-500 pt-1">
                      {r.garage && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={13} className="text-slate-400" aria-hidden="true" />
                          {r.garage.garage_name}
                          {r.garage.phone && ` (${formatPhone(r.garage.phone)})`}
                        </span>
                      )}
                      {(r.repair_start_date || r.estimated_end_date) && (
                        <span
                          className={
                            overdue
                              ? "inline-flex items-center gap-1 text-red-600 font-medium tabular-nums"
                              : "inline-flex items-center gap-1 tabular-nums"
                          }
                        >
                          <Clock size={13} aria-hidden="true" />
                          {r.repair_start_date && `เข้าซ่อม ${formatDate(r.repair_start_date)}`}
                          {r.estimated_end_date && ` • คาดเสร็จ ${formatDate(r.estimated_end_date)}`}
                          {overdue && " (เลยกำหนด)"}
                        </span>
                      )}
                    </div>

                    {(r.note || r.adminNote) && (
                      <div className="text-xs text-amber-900 bg-amber-50/70 border border-amber-200/70 px-3 py-2 rounded-xl">
                        <span className="font-semibold">หมายเหตุ:</span> {r.note || r.adminNote}
                      </div>
                    )}
                  </div>

                  {/* Cost Column */}
                  {(r.estimated_cost || r.total_cost) && (
                    <div className="shrink-0 sm:text-right space-y-1 tabular-nums">
                      {r.estimated_cost && (
                        <div>
                          <p className="text-[11px] text-slate-400">ราคาประเมิน</p>
                          <p className="text-sm font-semibold text-amber-700">
                            ฿{parseFloat(r.estimated_cost).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                      {r.total_cost && (
                        <div>
                          <p className="text-[11px] text-slate-400">ค่าใช้จ่ายจริง</p>
                          <p className="text-lg font-bold text-slate-900">
                            ฿{parseFloat(r.total_cost).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Receipt Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  {r.receipt_image ? (
                    <button
                      type="button"
                      onClick={() => setViewReceipt(r.receipt_image)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8A1ABA] bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg border border-purple-200/70 cursor-pointer"
                    >
                      <ImageIcon size={14} aria-hidden="true" />
                      ดูใบเสร็จ
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 inline-flex items-center gap-1.5">
                      <ImageIcon size={14} aria-hidden="true" />
                      ยังไม่ได้แนบใบเสร็จ
                    </span>
                  )}

                  {r.status !== "COMPLETED" && r.status !== "REJECTED" && (
                    <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium bg-white text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                      <Upload size={13} aria-hidden="true" />
                      {r.receipt_image ? "อัปโหลดใหม่" : "อัปโหลดสลิป"}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files[0]) {
                            handleUploadReceipt(r.request_id || r.id, e.target.files[0]);
                          }
                          e.target.value = null;
                        }}
                      />
                    </label>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => fetchRepairs(page - 1)}
            className="inline-flex items-center gap-1 px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white text-slate-700 disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft size={15} aria-hidden="true" />
            ก่อนหน้า
          </button>
          <span className="text-xs font-medium text-slate-600 px-3 py-2 tabular-nums">
            หน้า {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => fetchRepairs(page + 1)}
            className="inline-flex items-center gap-1 px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white text-slate-700 disabled:opacity-40 cursor-pointer"
          >
            ถัดไป
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </div>
      )}

      {viewReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setViewReceipt(null)}
          role="dialog"
          aria-modal="true"
          aria-label="ภาพใบเสร็จ"
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
              alt="ใบเสร็จรับเงิน"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
