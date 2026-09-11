import { useEffect, useState } from "react";
import {
  History,
  Wrench,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  DollarSign,
  Clock,
  Upload,
  Image as ImageIcon,
  X,
} from "lucide-react";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import clsx from "clsx";
import Skeleton from "../../components/Skeleton";
import { formatPhone } from "../../utils/format";

const repairTypeLabel = {
  GENERAL: "🔧 ซ่อมทั่วไป",
  EMERGENCY: "🚨 ซ่อมฉุกเฉิน",
  MAINTENANCE: "🛠️ บำรุงรักษา",
};

export default function DriverHistoryPage() {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [viewReceipt, setViewReceipt] = useState(null);

  const handleUploadReceipt = async (id, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("receipt", file);
    const loadingToast = toast.loading("กำลังอัปโหลดสลิป...");
    try {
      await api.post(`/repairs/${id}/receipt`, formData);
      toast.dismiss(loadingToast);
      toast.success("อัปโหลดสลิปสำเร็จ");
      fetchRepairs(page);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || "อัปโหลดสลิปไม่สำเร็จ");
    }
  };

  const fetchRepairs = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get("/repairs", { params: { page: p, limit: 10 } });
      setRepairs(res.data.data);
      setTotal(res.data.total);
      setPage(p);
    } catch {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    api
      .get("/repairs", { params: { page: 1, limit: 10 } })
      .then((res) => {
        if (isMounted) {
          setRepairs(res.data.data);
          setTotal(res.data.total);
          setPage(1);
        }
      })
      .catch(() => {
        if (isMounted) toast.error("โหลดข้อมูลไม่สำเร็จ");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getStatusInfo = (status) => {
    const map = {
      PENDING: {
        label: "📝 รอตรวจสอบ",
        cls: "bg-amber-50 text-amber-700 border-amber-200/80",
      },
      IN_PROGRESS: {
        label: "🔧 กำลังซ่อม",
        cls: "bg-blue-50 text-blue-700 border-blue-200/80",
      },
      AWAITING_APPROVAL: {
        label: "⏳ รออนุมัติงบ",
        cls: "bg-purple-50 text-purple-700 border-purple-200/80",
      },
      APPROVED: {
        label: "✅ อนุมัติแล้ว",
        cls: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      },
      COMPLETED: {
        label: "✅ เสร็จสิ้น",
        cls: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      },
      REJECTED: {
        label: "❌ ไม่อนุมัติ",
        cls: "bg-rose-50 text-rose-700 border-rose-200/80",
      },
    };
    return (
      map[status] || {
        label: status,
        cls: "bg-slate-100 text-slate-600 border-slate-200",
      }
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return d.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const isOverdueEst = (estimatedEndDate, status) => {
    if (!estimatedEndDate || status === "COMPLETED" || status === "REJECTED")
      return false;
    return new Date(estimatedEndDate) < new Date();
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100/80">
            <History size={26} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              ประวัติการซ่อมบำรุง
            </h1>
            <p className="text-xs md:text-sm text-slate-500">
              ติดตามสถานะและประวัติการส่งซ่อมทั้งหมดของยานพาหนะ
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-600 font-bold bg-slate-100 px-3.5 py-1.5 rounded-full self-start sm:self-auto border border-slate-200/60">
          ทั้งหมด {total} รายการ
        </div>
      </div>
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      )}
      {!loading && repairs.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200 shadow-xs">
          <Wrench size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-600">
            ยังไม่มีประวัติการแจ้งซ่อม
          </p>
          <p className="text-xs text-slate-400 mt-1">
            ประวัติการแจ้งซ่อมทั้งหมดของคุณจะแสดงที่นี่
          </p>
        </div>
      )}{" "}
      {!loading && repairs.length > 0 && (
        <div className="space-y-4">
          {repairs.map((r) => {
            const si = getStatusInfo(r.status);
            const overdue = isOverdueEst(r.estimated_end_date, r.status);
            return (
              <div
                key={r.request_id || r.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all p-5 md:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Status + ID + Date row */}
                    <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                      <span
                        className={clsx(
                          "px-3 py-1 rounded-full text-xs font-bold border",
                          si.cls,
                        )}
                      >
                        {si.label}
                      </span>
                      <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                        REQ-{String(r.request_id).padStart(4, "0")}
                      </span>
                      {r.repair_type && (
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          {repairTypeLabel[r.repair_type] || r.repair_type}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto sm:ml-0">
                        <Calendar size={13} />
                        {formatDate(r.created_at || r.createdAt)}
                      </span>
                    </div>

                    {/* Vehicle */}
                    <h2 className="font-bold text-slate-800 text-base mb-1">
                      {r.vehicle?.license_plate}{" "}
                      <span className="text-xs font-normal text-slate-500">
                        ({r.vehicle?.brand} {r.vehicle?.model})
                      </span>
                    </h2>

                    {/* Description */}
                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 mt-2.5">
                      {r.issue_description}
                    </p>

                    {/* Details Grid */}
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Garage */}
                      {r.garage && (
                        <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100">
                          <MapPin
                            size={13}
                            className="text-[#8A1ABA] mt-0.5 shrink-0"
                          />
                          <div>
                            <p className="font-semibold text-slate-700">
                              {r.garage.garage_name}
                            </p>
                            {r.garage.phone && (
                              <p className="text-slate-400 font-mono">
                                {formatPhone(r.garage.phone)}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Dates */}
                      {(r.repair_start_date || r.estimated_end_date) && (
                        <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100">
                          <Clock
                            size={13}
                            className="text-blue-500 mt-0.5 shrink-0"
                          />
                          <div>
                            {r.repair_start_date && (
                              <p>
                                เข้าซ่อม:{" "}
                                <span className="font-semibold">
                                  {formatDate(r.repair_start_date)}
                                </span>
                              </p>
                            )}
                            {r.estimated_end_date && (
                              <p
                                className={
                                  overdue ? "text-red-600 font-bold" : ""
                                }
                              >
                                {r.status === "COMPLETED"
                                  ? "เสร็จเมื่อ:"
                                  : "คาดว่าจะเสร็จ:"}{" "}
                                <span className="font-semibold">
                                  {formatDate(r.estimated_end_date)}
                                </span>
                                {overdue && " ⚠️ เลยกำหนด"}
                              </p>
                            )}
                            {r.repair_end_date && r.status === "COMPLETED" && (
                              <p>
                                เสร็จจริง:{" "}
                                <span className="font-semibold text-emerald-700">
                                  {formatDate(r.repair_end_date)}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Mileage */}
                      {r.mileage_at_repair ? (
                        <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100">
                          <span className="text-slate-400">🏎️</span>
                          <span>
                            เลขไมล์ขณะซ่อม:{" "}
                            <span className="font-semibold">
                              {r.mileage_at_repair.toLocaleString()} กม.
                            </span>
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Note */}
                    {(r.note || r.adminNote) && (
                      <div className="text-xs text-slate-600 mt-2 bg-amber-50/70 border border-amber-200/60 p-2.5 rounded-xl">
                        📌 <strong>หมายเหตุเพิ่มเติม:</strong>{" "}
                        {r.note || r.adminNote}
                      </div>
                    )}
                  </div>

                  {/* Cost Summary */}
                  <div className="shrink-0 sm:text-right">
                    {r.estimated_cost && (
                      <div className="bg-amber-50 border border-amber-200/60 rounded-xl px-4 py-2.5 mb-2">
                        <p className="text-xs text-amber-700 font-semibold uppercase tracking-wider flex items-center gap-1 sm:justify-end">
                          <DollarSign size={11} /> ราคาประเมิน
                        </p>
                        <p className="font-bold text-amber-800 text-base mt-0.5">
                          ฿
                          {parseFloat(r.estimated_cost).toLocaleString(
                            "th-TH",
                            { minimumFractionDigits: 2 },
                          )}
                        </p>
                      </div>
                    )}
                    {r.total_cost && (
                      <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2.5">
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1 sm:justify-end">
                          <DollarSign size={11} /> ค่าใช้จ่ายจริง
                        </p>
                        <p className="font-extrabold text-slate-800 text-lg mt-0.5">
                          ฿
                          {parseFloat(r.total_cost).toLocaleString("th-TH", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        {(r.parts_cost || r.labor_cost) && (
                          <div className="text-[11px] text-slate-500 mt-1 sm:text-right space-x-1.5">
                            <span>
                              อะไหล่: ฿
                              {parseFloat(r.parts_cost || 0).toLocaleString()}
                            </span>
                            <span>•</span>
                            <span>
                              ค่าแรง: ฿
                              {parseFloat(r.labor_cost || 0).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Receipt Section */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {r.receipt_image ? (
                      <button
                        onClick={() => setViewReceipt(r.receipt_image)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 cursor-pointer"
                      >
                        <ImageIcon size={14} /> ดูสลิปใบเสร็จ
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <ImageIcon size={14} /> ยังไม่ได้แนบสลิป
                      </span>
                    )}
                  </div>
                  {r.status !== "COMPLETED" && r.status !== "REJECTED" && (
                    <label className="cursor-pointer flex items-center gap-1.5 text-xs font-semibold bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors shadow-sm">
                      <Upload size={14} />{" "}
                      {r.receipt_image ? "อัปโหลดใหม่" : "อัปโหลดสลิป"}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files[0])
                            handleUploadReceipt(
                              r.request_id || r.id,
                              e.target.files[0],
                            );
                          e.target.value = null;
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            disabled={page === 1}
            onClick={() => fetchRepairs(page - 1)}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <ChevronLeft size={16} /> ก่อนหน้า
          </button>
          <span className="text-xs font-bold text-slate-600 bg-white px-3.5 py-2 rounded-xl border border-slate-200">
            หน้า {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => fetchRepairs(page + 1)}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
          >
            ถัดไป <ChevronRight size={16} />
          </button>
        </div>
      )}
      {/* Receipt Image Modal */}
      {viewReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200"
          onClick={() => setViewReceipt(null)}
        >
          <div
            className="relative max-w-3xl w-full flex flex-col items-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewReceipt(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-colors cursor-pointer"
            >
              <X size={24} />
            </button>
            <img
              src={viewReceipt}
              alt="Receipt"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
