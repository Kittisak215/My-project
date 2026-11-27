import { useEffect, useMemo, useState } from "react";
import {
  Car,
  Gauge,
  Wrench,
  Calendar,
  MapPin,
  Banknote,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import StatusBadge from "../../components/StatusBadge";
import Modal from "../../components/Modal";
import Skeleton from "../../components/Skeleton";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import clsx from "clsx";

/* ─── Number Formatting Helpers (per data-visualization skill) ─── */
const formatCompactCurrency = (val) => {
  const num = Number(val) || 0;
  if (Math.abs(num) >= 1e6) return `฿${(num / 1e6).toFixed(1)}M`;
  if (Math.abs(num) >= 1e3) return `฿${(num / 1e3).toFixed(0)}k`;
  return `฿${num.toLocaleString("th-TH")}`;
};

const formatFullCurrency = (val) =>
  `฿${(Number(val) || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const CATEGORY_LABEL = {
  GENERAL: "ซ่อมทั่วไป",
  MAINTENANCE: "บำรุงรักษาตามระยะ",
  EMERGENCY: "ซ่อมฉุกเฉิน",
};

const CATEGORY_COLOR = {
  GENERAL: "#8A1ABA",
  MAINTENANCE: "#0D9488",
  EMERGENCY: "#D97706",
};

/* ─── Custom Accessible Tooltip ─── */
function ExpenseTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;

  return (
    <div className="bg-white border border-purple-200/80 rounded-xl shadow-lg px-3.5 py-2.5 text-xs space-y-1.5 min-w-[170px]">
      <p className="font-semibold text-slate-900 border-b border-slate-100 pb-1">
        {label}
        {row?.count !== undefined && (
          <span className="text-slate-400 font-normal ml-1.5 tabular-nums">
            ({row.count} รายการ)
          </span>
        )}
      </p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 tabular-nums">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span
              className="w-2.5 h-2.5 rounded-xs shrink-0"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            {entry.name}
          </span>
          <span className="font-semibold text-slate-900">{formatFullCurrency(entry.value)}</span>
        </div>
      ))}
      {payload.length > 1 && row?.totalCost !== undefined && (
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 font-semibold text-[#8A1ABA] tabular-nums">
          <span>รวมทั้งหมด</span>
          <span>{formatFullCurrency(row.totalCost)}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Vehicle Expense Drilldown Modal ─── */
function VehicleExpenseModal({ vehicleId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [repairs, setRepairs] = useState([]);
  const [vehicle, setVehicle] = useState(null);

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;
    const loadRepairs = async () => {
      try {
        const res = await api.get("/reports/expense", { params: { vehicleId, limit: 100 } });
        if (cancelled) return;
        const rows = res.data.data || [];
        setRepairs(rows);
        if (rows.length > 0) setVehicle(rows[0].vehicle);
      } catch {
        if (!cancelled) toast.error("ไม่สามารถดึงข้อมูลประวัติการซ่อมได้");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadRepairs();
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  if (!vehicleId) return null;

  return (
    <Modal
      title="ประวัติการซ่อมบำรุง"
      subtitle={
        vehicle
          ? `ทะเบียน ${vehicle.license_plate} (${vehicle.brand} ${vehicle.model})`
          : "กำลังโหลดข้อมูล…"
      }
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : repairs.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">
          ไม่พบประวัติการซ่อมบำรุงที่อนุมัติแล้วของรถคันนี้
        </div>
      ) : (
        <div className="space-y-3">
          {repairs.map((repair) => (
            <div
              key={repair.request_id}
              className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={repair.status} />
                  <span
                    className={clsx(
                      "px-2 py-0.5 rounded-md text-[11px] font-medium border",
                      repair.repair_type === "EMERGENCY"
                        ? "bg-red-50 text-red-700 border-red-200/80"
                        : "bg-white text-slate-600 border-slate-200",
                    )}
                  >
                    {CATEGORY_LABEL[repair.repair_type] || repair.repair_type}
                  </span>
                </div>
                <span className="text-base font-bold text-[#8A1ABA] tabular-nums">
                  {formatFullCurrency(repair.total_cost)}
                </span>
              </div>
              <p className="text-sm text-slate-800">
                {repair.issue_description || repair.description || "ไม่ระบุรายละเอียด"}
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500 pt-1 tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={13} aria-hidden="true" />
                  {new Date(repair.created_at).toLocaleDateString("th-TH")}
                </span>
                {repair.mileage && (
                  <span className="inline-flex items-center gap-1">
                    <Gauge size={13} aria-hidden="true" />
                    {repair.mileage.toLocaleString("th-TH")} กม.
                  </span>
                )}
                {repair.garage?.name && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} aria-hidden="true" />
                    {repair.garage.name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export default function ExecutiveDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState("monthly");
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  useEffect(() => {
    api
      .get("/reports/executive")
      .then((res) => setData(res.data))
      .catch(() => toast.error("โหลดข้อมูลภาพรวมผู้บริหารไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats || {};
  const yearlyExpenses = useMemo(() => data?.yearlyExpenses || [], [data]);
  const monthlyExpenses = useMemo(() => data?.monthlyExpenses || [], [data]);
  const categoryExpenses = useMemo(() => data?.categoryExpenses || [], [data]);
  const topVehicles = useMemo(() => data?.topVehicles || [], [data]);

  const currentYearTh = new Date().getFullYear() + 543;

  // Insight headline for main chart
  const peakMonth = useMemo(() => {
    if (!monthlyExpenses.length) return null;
    const best = monthlyExpenses.reduce(
      (max, cur) => (cur.totalCost > max.totalCost ? cur : max),
      monthlyExpenses[0],
    );
    return best.totalCost > 0 ? best : null;
  }, [monthlyExpenses]);

  // Top-5 chart dataset (sorted highest first)
  const topVehicleChartData = useMemo(
    () =>
      topVehicles.map((tv) => ({
        vehicleId: tv.vehicle?.vehicle_id || tv.vehicle?.id,
        plate: tv.vehicle?.license_plate || "ไม่ระบุ",
        model: `${tv.vehicle?.brand || ""} ${tv.vehicle?.model || ""}`.trim(),
        totalCost: tv.totalCost || 0,
        count: tv.repairCount || 0,
      })),
    [topVehicles],
  );

  // Category comparison dataset
  const categoryTotal = useMemo(
    () => categoryExpenses.reduce((sum, c) => sum + (c.totalCost || 0), 0),
    [categoryExpenses],
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-10">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-8 h-96 rounded-2xl" />
          <Skeleton className="lg:col-span-4 h-96 rounded-2xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  const yearlyExpenseTotal = stats.yearlyExpense || 0;
  const availabilityRate = stats.availabilityRate || 0;
  const totalMileage = stats.totalMileage || 0;
  const totalVehicles = stats.totalVehicles || 0;
  const readyVehicles = stats.readyVehicles || 0;
  const unavailableVehicles =
    stats.unavailableVehicles ?? Math.max(0, totalVehicles - readyVehicles);

  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const readyStroke = (availabilityRate / 100) * circ;
  const isHealthy = availabilityRate >= 80;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          ภาพรวมผู้บริหาร
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          สรุปความพร้อมใช้งานยานพาหนะ การเปรียบเทียบงบประมาณซ่อมบำรุง และรถที่มีค่าใช้จ่ายสูงสุด
        </p>
      </div>

      {/* Unified KPI Strip */}
      <section
        aria-label="ตัวชี้วัดหลักสำหรับผู้บริหาร"
        className="bg-white rounded-2xl border border-purple-200/70 border-t-[3px] border-t-[#8A1ABA] shadow-xs overflow-hidden"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80">
          <div className="p-5">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Car size={15} className="text-[#8A1ABA]" aria-hidden="true" />
              ยานพาหนะทั้งหมด
            </span>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl md:text-3xl font-bold text-slate-900 tabular-nums">
                {totalVehicles.toLocaleString("th-TH")}
              </span>
              <span className="text-sm text-slate-500">คัน</span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 tabular-nums">
              พร้อมใช้ {readyVehicles} คัน • กำลังซ่อม {unavailableVehicles} คัน
            </p>
          </div>

          <div className="p-5">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Activity size={15} className="text-emerald-600" aria-hidden="true" />
              อัตราความพร้อมใช้งาน
            </span>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-bold text-slate-900 tabular-nums">
                {availabilityRate}%
              </span>
              <span
                className={clsx(
                  "text-xs font-medium px-2 py-0.5 rounded-full border",
                  isHealthy
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                    : "bg-amber-50 text-amber-700 border-amber-200/80",
                )}
              >
                {isHealthy ? "เกณฑ์ดี" : "เฝ้าระวัง"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">เป้าหมายความพร้อมไม่ต่ำกว่า 80%</p>
          </div>

          <div className="p-5 sm:border-t lg:border-t-0">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Banknote size={15} className="text-[#8A1ABA]" aria-hidden="true" />
              ค่าซ่อมรวมปี {currentYearTh}
            </span>
            <div className="mt-2.5 flex items-baseline gap-1 min-w-0">
              <span className="text-base font-semibold text-slate-400">฿</span>
              <span className="text-2xl md:text-3xl font-bold text-[#8A1ABA] tabular-nums truncate">
                {yearlyExpenseTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">เฉพาะรายการซ่อมที่เสร็จสิ้นแล้ว</p>
          </div>

          <div className="p-5 sm:border-t lg:border-t-0">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Wrench size={15} className="text-slate-600" aria-hidden="true" />
              ระยะทางสะสมรวม
            </span>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl md:text-3xl font-bold text-slate-900 tabular-nums">
                {totalMileage.toLocaleString("th-TH")}
              </span>
              <span className="text-sm text-slate-500">กม.</span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">ระยะทางสะสมของรถทุกคันในระบบ</p>
          </div>
        </div>
      </section>

      {/* Primary Charts Grid: Stacked Monthly / Yearly Bar + Fleet Readiness & Category */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Interactive Bar Chart (8 cols) */}
        <section className="lg:col-span-8 bg-white rounded-2xl border border-purple-200/60 shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-purple-100/80 bg-purple-50/40 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {chartMode === "monthly"
                  ? peakMonth
                    ? `ค่าซ่อมรายเดือนปี ${currentYearTh} สูงสุดในเดือน ${peakMonth.label} (${formatCompactCurrency(peakMonth.totalCost)})`
                    : `เปรียบเทียบค่าซ่อมบำรุงรายเดือน ปี ${currentYearTh}`
                  : "เปรียบเทียบยอดค่าซ่อมบำรุงรวมรายปี"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {chartMode === "monthly"
                  ? "แยกสัดส่วนค่าอะไหล่และค่าแรงช่าง (บาท) • ชี้ที่แท่งกราฟเพื่อดูยอดละเอียด"
                  : "เปรียบเทียบยอดใช้จ่ายรวมแต่ละปี พ.ศ. (บาท)"}
              </p>
            </div>

            {/* Segmented Switcher */}
            <div
              className="inline-flex bg-white border border-purple-200/70 rounded-xl p-1 text-xs font-medium"
              role="tablist"
              aria-label="มุมมองกราฟค่าใช้จ่าย"
            >
              <button
                type="button"
                role="tab"
                aria-selected={chartMode === "monthly"}
                onClick={() => setChartMode("monthly")}
                className={clsx(
                  "px-3 py-1 rounded-lg transition-colors cursor-pointer",
                  chartMode === "monthly"
                    ? "bg-[#8A1ABA] text-white"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                รายเดือน (อะไหล่/ค่าแรง)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={chartMode === "yearly"}
                onClick={() => setChartMode("yearly")}
                className={clsx(
                  "px-3 py-1 rounded-lg transition-colors cursor-pointer",
                  chartMode === "yearly"
                    ? "bg-[#8A1ABA] text-white"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                เปรียบเทียบรายปี
              </button>
            </div>
          </div>

          <div
            className="p-5 flex-1 min-h-[320px]"
            role="img"
            aria-label={
              chartMode === "monthly"
                ? `กราฟแท่งเปรียบเทียบค่าอะไหล่และค่าแรงช่างรายเดือน ปี ${currentYearTh}`
                : "กราฟแท่งเปรียบเทียบค่าใช้จ่ายซ่อมบำรุงรายปี"
            }
          >
            {chartMode === "monthly" ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={monthlyExpenses}
                  margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                  barCategoryGap="24%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDE9FE" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, "auto"]}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCompactCurrency}
                    tick={{ fill: "#64748B", fontSize: 11 }}
                    width={62}
                  />
                  <Tooltip content={<ExpenseTooltip />} cursor={{ fill: "#F5F1FA" }} />
                  <Legend
                    iconType="square"
                    iconSize={10}
                    wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                  />
                  <Bar
                    dataKey="partsCost"
                    name="ค่าอะไหล่"
                    stackId="expense"
                    fill="#8A1ABA"
                    radius={[0, 0, 4, 4]}
                    maxBarSize={36}
                  />
                  <Bar
                    dataKey="laborCost"
                    name="ค่าแรงช่าง"
                    stackId="expense"
                    fill="#D97706"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : yearlyExpenses.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={yearlyExpenses}
                  margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                  barCategoryGap="35%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDE9FE" />
                  <XAxis
                    dataKey="yearTh"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, "auto"]}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCompactCurrency}
                    tick={{ fill: "#64748B", fontSize: 11 }}
                    width={62}
                  />
                  <Tooltip content={<ExpenseTooltip />} cursor={{ fill: "#F5F1FA" }} />
                  <Bar
                    dataKey="totalCost"
                    name="ค่าซ่อมรวม"
                    fill="#8A1ABA"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={64}
                  >
                    {yearlyExpenses.map((entry) => (
                      <Cell
                        key={entry.year}
                        fill={
                          entry.year === new Date().getFullYear() ? "#8A1ABA" : "#C4B5FD"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-sm text-slate-400">
                ยังไม่มีข้อมูลเปรียบเทียบรายปี
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Fleet Readiness + Repair Category Comparison (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Single KPI Donut: Fleet Availability */}
          <section className="bg-white rounded-2xl border border-purple-200/60 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-purple-100/80 bg-purple-50/40">
              <h2 className="text-sm font-semibold text-slate-900">สัดส่วนความพร้อมยานพาหนะ</h2>
            </div>
            <div className="p-5 flex items-center gap-5">
              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 112 112" aria-hidden="true">
                  <circle
                    cx="56"
                    cy="56"
                    r={radius}
                    fill="transparent"
                    stroke="#F3E8FF"
                    strokeWidth="11"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r={radius}
                    fill="transparent"
                    stroke={isHealthy ? "#0D9488" : "#D97706"}
                    strokeWidth="11"
                    strokeDasharray={`${readyStroke} ${circ}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900 tabular-nums leading-none">
                    {availabilityRate}%
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">พร้อมใช้</span>
                </div>
              </div>

              <div className="flex-1 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600" aria-hidden="true" />
                    พร้อมใช้งาน
                  </span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {readyVehicles} คัน
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" aria-hidden="true" />
                    กำลังซ่อม
                  </span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {unavailableVehicles} คัน
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500">
                  <span>รวมทั้งหมด</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {totalVehicles} คัน
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Horizontal Bar Comparison: Expense by Repair Category */}
          <section className="bg-white rounded-2xl border border-purple-200/60 shadow-xs overflow-hidden flex-1">
            <div className="px-5 py-3.5 border-b border-purple-100/80 bg-purple-50/40">
              <h2 className="text-sm font-semibold text-slate-900">
                สัดส่วนค่าซ่อมตามประเภท (ปี {currentYearTh})
              </h2>
            </div>
            <div className="p-5 space-y-3.5">
              {categoryExpenses.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  ยังไม่มีข้อมูลค่าซ่อมในปีนี้
                </p>
              ) : (
                categoryExpenses.map((cat) => {
                  const pct =
                    categoryTotal > 0 ? Math.round((cat.totalCost / categoryTotal) * 100) : 0;
                  const barColor = CATEGORY_COLOR[cat.type] || "#8A1ABA";
                  return (
                    <div key={cat.type} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="font-medium text-slate-700">
                          {CATEGORY_LABEL[cat.type] || cat.type}
                          <span className="text-slate-400 font-normal ml-1 tabular-nums">
                            ({cat.count} ครั้ง)
                          </span>
                        </span>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {formatCompactCurrency(cat.totalCost)}{" "}
                          <span className="text-slate-400 font-normal">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-purple-50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: barColor }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Top 5 Highest-Cost Vehicles: Horizontal Ranked Bar Chart + Clickable Table */}
      <section className="bg-white rounded-2xl border border-purple-200/60 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-100/80 bg-purple-50/40 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              5 อันดับยานพาหนะค่าซ่อมสูงสุด ปี {currentYearTh}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              เปรียบเทียบยอดค่าซ่อมสะสมรายคัน • คลิกที่แท่งกราฟหรือแถวตารางเพื่อดูประวัติซ่อม
            </p>
          </div>
        </div>

        {topVehicleChartData.length > 0 && (
          <div
            className="px-5 pt-5 pb-2 border-b border-slate-100"
            role="img"
            aria-label="กราฟแท่งแนวนอนจัดอันดับ 5 ยานพาหนะที่มีค่าซ่อมสูงสุด"
          >
            <ResponsiveContainer width="100%" height={Math.max(180, topVehicleChartData.length * 46)}>
              <BarChart
                data={topVehicleChartData}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 10, bottom: 4 }}
                barCategoryGap="24%"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EDE9FE" />
                <XAxis
                  type="number"
                  domain={[0, "auto"]}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatCompactCurrency}
                  tick={{ fill: "#64748B", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="plate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#0F172A", fontSize: 12, fontWeight: 600 }}
                  width={95}
                />
                <Tooltip content={<ExpenseTooltip />} cursor={{ fill: "#F5F1FA" }} />
                <Bar
                  dataKey="totalCost"
                  name="ค่าซ่อมรวม"
                  radius={[0, 8, 8, 0]}
                  maxBarSize={26}
                  onClick={(barData) => {
                    if (barData?.vehicleId) setSelectedVehicleId(barData.vehicleId);
                  }}
                  className="cursor-pointer"
                >
                  {topVehicleChartData.map((entry, idx) => (
                    <Cell
                      key={entry.vehicleId || idx}
                      fill={idx === 0 ? "#8A1ABA" : idx === 1 ? "#A855F7" : "#C084FC"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-xs font-medium border-b border-slate-200/80">
                <th className="px-5 py-3 text-center w-16">อันดับ</th>
                <th className="px-4 py-3">ทะเบียนรถ / รุ่น</th>
                <th className="px-4 py-3">ผู้รับผิดชอบ</th>
                <th className="px-4 py-3 text-center">จำนวนครั้ง</th>
                <th className="px-5 py-3 text-right">ค่าซ่อมรวม (บาท)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!topVehicles.length ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    ยังไม่มีข้อมูลค่าซ่อมบำรุง
                  </td>
                </tr>
              ) : (
                topVehicles.map((tv, i) => (
                  <tr
                    key={tv.vehicle?.vehicle_id || tv.vehicle?.id || i}
                    onClick={() => setSelectedVehicleId(tv.vehicle?.vehicle_id || tv.vehicle?.id)}
                    className="hover:bg-purple-50/40 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 text-center font-semibold text-slate-500 tabular-nums">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {tv.vehicle?.license_plate || "ไม่ระบุ"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {tv.vehicle?.brand} {tv.vehicle?.model}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {tv.vehicle?.driver?.full_name || tv.vehicle?.driver?.fullName || "-"}
                    </td>
                    <td className="px-4 py-3.5 text-center tabular-nums">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-[#8A1ABA] border border-purple-200/60">
                        {tv.repairCount} ครั้ง
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-[#8A1ABA] tabular-nums">
                      {formatFullCurrency(tv.totalCost)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedVehicleId && (
        <VehicleExpenseModal
          vehicleId={selectedVehicleId}
          onClose={() => setSelectedVehicleId(null)}
        />
      )}
    </div>
  );
}
