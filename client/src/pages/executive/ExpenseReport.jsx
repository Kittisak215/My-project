import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Printer,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
  FileOutput,
} from "lucide-react";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import clsx from "clsx";
import Skeleton from "../../components/Skeleton";

const categoryMap = {
  GENERAL: { label: "ซ่อมทั่วไป", bg: "bg-slate-100 text-slate-700 border-slate-200/80" },
  MAINTENANCE: { label: "บำรุงรักษาตามระยะ", bg: "bg-emerald-50 text-emerald-700 border-emerald-200/80" },
  EMERGENCY: { label: "ซ่อมฉุกเฉิน", bg: "bg-red-50 text-red-700 border-red-200/80" },
};

function CategoryBadge({ type }) {
  const item = categoryMap[type] || {
    label: type || "ทั่วไป",
    bg: "bg-slate-100 text-slate-700 border-slate-200/80",
  };
  return (
    <span
      className={clsx(
        "px-2 py-0.5 rounded-md text-xs font-medium border inline-block print:bg-transparent print:border-none print:text-black print:p-0 print:font-normal",
        item.bg,
      )}
    >
      {item.label}
    </span>
  );
}

export default function ExpenseReportPage() {
  const [data, setData] = useState({
    data: [],
    totalAmount: 0,
    totalPartsCost: 0,
    totalLaborCost: 0,
    avgAmount: 0,
    maxAmount: 0,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    vehicleId: "all",
    category: "all",
  });
  const [activePreset, setActivePreset] = useState("all");

  useEffect(() => {
    api
      .get("/vehicles", { params: { limit: 100 } })
      .then((res) => setVehicles(res.data?.data || res.data || []))
      .catch(() => {});
  }, []);

  const fetchData = useCallback(
    async (targetPage = 1, currentFilters = filters) => {
      setLoading(true);
      try {
        const res = await api.get("/reports/expense", {
          params: {
            from: currentFilters.from || undefined,
            to: currentFilters.to || undefined,
            vehicleId: currentFilters.vehicleId !== "all" ? currentFilters.vehicleId : undefined,
            category: currentFilters.category !== "all" ? currentFilters.category : undefined,
            page: targetPage,
            limit: 10,
          },
        });
        setData(res.data);
        setPage(targetPage);
      } catch {
        toast.error("ไม่สามารถโหลดข้อมูลรายงานได้");
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    fetchData(1, { from: "", to: "", vehicleId: "all", category: "all" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePreset = (preset) => {
    setActivePreset(preset);
    const now = new Date();
    let newFrom = "";
    let newTo = "";

    if (preset === "thisMonth") {
      newFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      newTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    } else if (preset === "last3Months") {
      newFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split("T")[0];
      newTo = now.toISOString().split("T")[0];
    } else if (preset === "thisYear") {
      newFrom = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
      newTo = new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0];
    }

    const updated = { ...filters, from: newFrom, to: newTo };
    setFilters(updated);
    fetchData(1, updated);
  };

  const handleReset = () => {
    const resetFilters = { from: "", to: "", vehicleId: "all", category: "all" };
    setFilters(resetFilters);
    setActivePreset("all");
    fetchData(1, resetFilters);
  };

  const handleSearch = (e) => {
    e?.preventDefault();
    setActivePreset("custom");
    fetchData(1, filters);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await api.get("/reports/expense", {
        params: {
          from: filters.from || undefined,
          to: filters.to || undefined,
          vehicleId: filters.vehicleId !== "all" ? filters.vehicleId : undefined,
          category: filters.category !== "all" ? filters.category : undefined,
          exportAll: "true",
        },
      });
      const rows = res.data?.data || [];
      if (!rows.length) {
        toast.warning("ไม่พบข้อมูลที่จะส่งออก");
        return;
      }

      const headers = [
        "วันที่",
        "เลขที่คำร้อง",
        "ทะเบียนรถ",
        "ยี่ห้อ/รุ่น",
        "ผู้รับผิดชอบ",
        "หมวดหมู่",
        "รายละเอียด",
        "ศูนย์บริการ/อู่",
        "ค่าอะไหล่ (บาท)",
        "ค่าแรงช่าง (บาท)",
        "ยอดเงินรวม (บาท)",
      ];
      const csvRows = [headers.join(",")];

      rows.forEach((r) => {
        let dateStr = "-";
        const dVal = r.repair_end_date || r.request_date || r.created_at;
        if (dVal) {
          const d = new Date(dVal);
          dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
        const code = `REQ-${String(r.request_id).padStart(4, "0")}`;
        const plate = `"${(r.vehicle?.license_plate || "-").replace(/"/g, '""')}"`;
        const brand = `"${`${r.vehicle?.brand || ""} ${r.vehicle?.model || ""}`.trim() || "-"}"`;
        const driver = `"${(r.vehicle?.driver?.full_name || r.driver?.full_name || "-").replace(/"/g, '""')}"`;
        const category = `"${categoryMap[r.repair_type]?.label || r.repair_type || "ทั่วไป"}"`;
        const desc = `"${(r.issue_description || r.repair_detail || r.description || "-").replace(/"/g, '""')}"`;
        const garage = `"${(r.garage?.garage_name || "-").replace(/"/g, '""')}"`;
        csvRows.push(
          [
            dateStr,
            code,
            plate,
            brand,
            driver,
            category,
            desc,
            garage,
            Number(r.parts_cost) || 0,
            Number(r.labor_cost) || 0,
            Number(r.total_cost) || 0,
          ].join(","),
        );
      });

      const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expense_report_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("ส่งออกไฟล์ CSV เรียบร้อยแล้ว");
    } catch {
      toast.error("ไม่สามารถส่งออกไฟล์ได้");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-10 print:max-w-none print:space-y-4 print:pb-0 print:bg-white print:p-4">
      <style type="text/css" media="print">
        {`@page { size: A4 portrait; margin: 1.2cm 1cm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`}
      </style>

      {/* Print Header */}
      <div className="hidden print:block text-center pb-4 border-b border-slate-400 mb-6">
        <h1 className="text-xl font-bold text-black mb-1">รายงานสรุปค่าใช้จ่ายการซ่อมบำรุงยานพาหนะ</h1>
        <p className="text-sm text-slate-700 mb-3">
          ข้อมูล ณ วันที่{" "}
          {new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
        </p>
        <div className="text-sm text-slate-800 flex items-center justify-between px-4">
          <span>จำนวนรายการ: {data.total || 0} รายการ</span>
          <span>
            ยอดรวมทั้งสิ้น: ฿{(data.totalAmount || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </span>
          <span>
            เฉลี่ยต่อรายการ: ฿{(data.avgAmount || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            รายงานสรุปค่าใช้จ่ายการซ่อมบำรุง
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            วิเคราะห์ค่าใช้จ่ายตามช่วงเวลา ยานพาหนะ และประเภทการซ่อม พร้อมส่งออกเอกสาร
          </p>
        </div>

        <div className="relative self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#8A1ABA] hover:bg-[#73149c] transition-colors disabled:opacity-60 cursor-pointer"
          >
            <FileOutput size={16} aria-hidden="true" />
            {exporting ? "กำลังเตรียมเอกสาร…" : "ส่งออกรายงาน"}
            <ChevronDown size={15} className={clsx(exportMenuOpen && "rotate-180")} aria-hidden="true" />
          </button>

          {exportMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200/90 py-1.5 z-50">
                <button
                  type="button"
                  onClick={() => {
                    setExportMenuOpen(false);
                    window.print();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <Printer size={16} className="text-slate-500" aria-hidden="true" />
                  พิมพ์รายงาน (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExportMenuOpen(false);
                    handleExportCSV();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <FileSpreadsheet size={16} className="text-emerald-600" aria-hidden="true" />
                  ส่งออกเป็น CSV
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3.5 print:hidden">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
          <span className="text-xs font-medium text-slate-500">ช่วงเวลาด่วน</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: "all", label: "ทั้งหมด" },
              { key: "thisMonth", label: "เดือนนี้" },
              { key: "last3Months", label: "3 เดือนล่าสุด" },
              { key: "thisYear", label: `ปีนี้ (${new Date().getFullYear() + 543})` },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => handlePreset(p.key)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                  activePreset === p.key
                    ? "bg-[#8A1ABA] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">ตั้งแต่วันที่</label>
            <DatePicker
              selected={filters.from ? new Date(filters.from) : null}
              onChange={(date) => {
                setFilters((f) => ({ ...f, from: date ? date.toLocaleDateString("en-CA") : "" }));
                setActivePreset("custom");
              }}
              dateFormat="dd/MM/yyyy"
              placeholderText="วว/ดด/ปปปป"
              className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-xl px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">ถึงวันที่</label>
            <DatePicker
              selected={filters.to ? new Date(filters.to) : null}
              onChange={(date) => {
                setFilters((f) => ({ ...f, to: date ? date.toLocaleDateString("en-CA") : "" }));
                setActivePreset("custom");
              }}
              dateFormat="dd/MM/yyyy"
              placeholderText="วว/ดด/ปปปป"
              className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-xl px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
            />
          </div>

          <div>
            <label htmlFor="exp-veh" className="text-xs font-medium text-slate-600 mb-1 block">
              ยานพาหนะ
            </label>
            <select
              id="exp-veh"
              value={filters.vehicleId}
              onChange={(e) => setFilters((f) => ({ ...f, vehicleId: e.target.value }))}
              className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-xl px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
            >
              <option value="all">รถทุกคันในระบบ</option>
              {vehicles.map((v) => (
                <option key={v.vehicle_id || v.id} value={v.vehicle_id || v.id}>
                  {v.license_plate} {v.brand ? `(${v.brand})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="exp-cat" className="text-xs font-medium text-slate-600 mb-1 block">
              หมวดหมู่การซ่อม
            </label>
            <select
              id="exp-cat"
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-xl px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA]"
            >
              <option value="all">ทุกหมวดหมู่</option>
              <option value="GENERAL">ซ่อมทั่วไป</option>
              <option value="EMERGENCY">ซ่อมฉุกเฉิน</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 cursor-pointer"
            >
              <RotateCcw size={14} aria-hidden="true" />
              ล้างตัวกรอง
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 cursor-pointer"
            >
              <Search size={14} aria-hidden="true" />
              ค้นหาข้อมูล
            </button>
          </div>
        </form>
      </div>

      {/* Unified Summary Strip */}
      <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden print:hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80">
          <div className="p-4 md:p-5">
            <p className="text-xs text-slate-500">ยอดรวมค่าใช้จ่าย</p>
            <p className="text-xl md:text-2xl font-bold text-[#8A1ABA] mt-1 tabular-nums">
              ฿{(data.totalAmount || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 md:p-5">
            <p className="text-xs text-slate-500">ค่าอะไหล่รวม</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              ฿{(data.totalPartsCost || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 md:p-5 border-t lg:border-t-0">
            <p className="text-xs text-slate-500">ค่าแรงช่างรวม</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              ฿{(data.totalLaborCost || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 md:p-5 border-t lg:border-t-0">
            <p className="text-xs text-slate-500">จำนวนรายการซ่อม</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {(data.total || 0).toLocaleString("th-TH")}{" "}
              <span className="text-xs font-normal text-slate-400">
                (เฉลี่ย ฿{(data.avgAmount || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })})
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Report Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden print:border-none print:rounded-none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse print:text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-xs font-medium border-b border-slate-200/80 print:bg-slate-50 print:text-black">
                <th className="px-5 py-3.5 print:border print:border-slate-300 print:px-2 print:py-2">วันที่ / เลขคำร้อง</th>
                <th className="px-4 py-3.5 print:border print:border-slate-300 print:px-2 print:py-2">ยานพาหนะ / ผู้รับผิดชอบ</th>
                <th className="px-4 py-3.5 print:border print:border-slate-300 print:px-2 print:py-2">หมวดหมู่</th>
                <th className="px-4 py-3.5 print:border print:border-slate-300 print:px-2 print:py-2">รายละเอียด / อู่</th>
                <th className="px-5 py-3.5 text-right print:border print:border-slate-300 print:px-2 print:py-2">ยอดรวม (บาท)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading &&
                [1, 2, 3, 4].map((i) => (
                  <tr key={i} className="print:hidden">
                    <td colSpan={5} className="px-5 py-4">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))}
              {!loading && (!data.data || data.data.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    ไม่พบรายการค่าใช้จ่ายตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              )}
              {!loading &&
                data.data?.map((r) => {
                  const dateStr =
                    r.repair_end_date || r.request_date || r.created_at
                      ? new Date(
                          r.repair_end_date || r.request_date || r.created_at,
                        ).toLocaleDateString("th-TH", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })
                      : "-";
                  return (
                    <tr key={r.request_id || r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap print:border print:border-slate-300 print:px-2 print:py-1.5">
                        <div className="font-semibold text-slate-900 tabular-nums">
                          REQ-{String(r.request_id).padStart(4, "0")}
                        </div>
                        <div className="text-xs text-slate-400 tabular-nums">{dateStr}</div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap print:border print:border-slate-300 print:px-2 print:py-1.5">
                        <div className="font-semibold text-slate-900">
                          {r.vehicle?.license_plate || "-"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {r.vehicle?.driver?.full_name || r.driver?.full_name || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 print:border print:border-slate-300 print:px-2 print:py-1.5">
                        <CategoryBadge type={r.repair_type} />
                      </td>
                      <td className="px-4 py-3.5 max-w-xs print:border print:border-slate-300 print:px-2 print:py-1.5">
                        <div className="text-slate-800 text-xs line-clamp-2">
                          {r.issue_description || r.repair_detail || r.description || "-"}
                        </div>
                        {r.garage?.garage_name && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            อู่: {r.garage.garage_name}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap tabular-nums print:border print:border-slate-300 print:px-2 print:py-1.5">
                        <div className="font-semibold text-slate-900">
                          ฿{(Number(r.total_cost) || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </div>
                        {(r.parts_cost || r.labor_cost) && (
                          <div className="text-[11px] text-slate-400">
                            อะไหล่ {Number(r.parts_cost || 0).toLocaleString("th-TH")} • ค่าแรง{" "}
                            {Number(r.labor_cost || 0).toLocaleString("th-TH")}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 print:hidden">
          <span className="tabular-nums">
            หน้า {page} จาก {data.totalPages || 1} ({data.total || 0} รายการ)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => fetchData(page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={14} aria-hidden="true" />
              ก่อนหน้า
            </button>
            <button
              type="button"
              disabled={page >= (data.totalPages || 1)}
              onClick={() => fetchData(page + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 disabled:opacity-40 cursor-pointer"
            >
              ถัดไป
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
