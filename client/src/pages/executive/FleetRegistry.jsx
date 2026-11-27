import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import clsx from "clsx";
import Skeleton from "../../components/Skeleton";
import { formatPhone } from "../../utils/format";

const FleetStatusPill = ({ vehicle }) => {
  if (vehicle?.is_active === false) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-100 text-slate-600 border-slate-200/80 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" aria-hidden="true" />
        ปลดระวาง
      </span>
    );
  }
  if (vehicle?.status === "IN_REPAIR") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200/80 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
        กำลังซ่อม
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200/80 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
      พร้อมใช้งาน
    </span>
  );
};

export default function FleetRegistryPage() {
  const [vehicles, setVehicles] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadVehicles = async () => {
      try {
        const res = await api.get("/vehicles", { params: { search, status, limit: 50 } });
        if (cancelled) return;
        setVehicles(res.data.data || []);
        setTotal(res.data.total || 0);
      } catch {
        if (!cancelled) toast.error("โหลดข้อมูลทะเบียนรถไม่สำเร็จ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadVehicles();
    return () => {
      cancelled = true;
    };
  }, [search, status]);

  const readyCount = vehicles.filter((v) => v.status === "READY" && v.is_active !== false).length;
  const thisYear = new Date().getFullYear();

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-10">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          ทำเนียบและสถานะทรัพย์สินยานพาหนะ
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          ตรวจสอบรายละเอียด อายุการใช้งาน เลขไมล์สะสม และสถานะรถทุกคันในหน่วยงาน
        </p>
      </div>

      {/* Summary Strip */}
      <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-slate-200/80">
          <div className="p-4 md:p-5">
            <p className="text-xs text-slate-500">รถในความดูแล</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {total.toLocaleString("th-TH")} <span className="text-xs font-normal text-slate-400">คัน</span>
            </p>
          </div>
          <div className="p-4 md:p-5">
            <p className="text-xs text-slate-500">พร้อมใช้งาน</p>
            <p className="text-xl md:text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
              {readyCount.toLocaleString("th-TH")} <span className="text-xs font-normal text-slate-400">คัน</span>
            </p>
          </div>
          <div className="p-4 md:p-5">
            <p className="text-xs text-slate-500">อัตราความพร้อม</p>
            <p className="text-xl md:text-2xl font-bold text-[#8A1ABA] mt-1 tabular-nums">
              {total > 0 ? Math.round((readyCount / total) * 100) : 0}%
            </p>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <label htmlFor="fleet-search" className="sr-only">
            ค้นหาป้ายทะเบียนหรือรุ่น
          </label>
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="fleet-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาป้ายทะเบียน, รุ่น…"
            autoComplete="off"
            spellCheck={false}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] transition-colors"
          />
        </div>
        <select
          aria-label="กรองตามสถานะรถ"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="sm:w-44 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] transition-colors"
        >
          <option value="">ทุกสถานะ</option>
          <option value="READY">พร้อมใช้งาน</option>
          <option value="IN_REPAIR">กำลังซ่อม</option>
          <option value="INACTIVE">ปลดระวาง</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-xs font-medium border-b border-slate-200/80">
                <th className="px-5 py-3.5 w-14 text-center">ลำดับ</th>
                <th className="px-4 py-3.5">ป้ายทะเบียน / ประเภท</th>
                <th className="px-4 py-3.5">ยี่ห้อ / รุ่น / อายุรถ</th>
                <th className="px-4 py-3.5">ผู้รับผิดชอบ</th>
                <th className="px-4 py-3.5 text-right">ไมล์สะสม (กม.)</th>
                <th className="px-5 py-3.5 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading &&
                [1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-5 py-4">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))}
              {!loading && vehicles.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    ไม่พบข้อมูลยานพาหนะ
                  </td>
                </tr>
              )}
              {!loading &&
                vehicles.map((v, i) => (
                  <tr
                    key={v.vehicle_id || v.id}
                    className={clsx(
                      "hover:bg-slate-50/70 transition-colors",
                      v.is_active === false && "opacity-65",
                    )}
                  >
                    <td className="px-5 py-3.5 text-center text-slate-400 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{v.license_plate}</div>
                      <div className="text-xs text-slate-500">
                        {v.vehicleType?.type_name || v.type || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-medium text-slate-900">
                        {v.brand} {v.model}
                      </div>
                      <div className="text-xs text-slate-500">
                        สี{v.color || "-"} • อายุ {v.year ? Math.max(0, thisYear - v.year) : "-"} ปี ({v.year || "-"})
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="text-slate-800">{v.driver?.full_name || v.driver?.fullName || "-"}</div>
                      {v.driver?.phone && (
                        <div className="text-xs text-slate-400 tabular-nums">
                          {formatPhone(v.driver.phone)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {(v.current_mileage || v.currentMileage || 0).toLocaleString("th-TH")}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <FleetStatusPill vehicle={v} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 tabular-nums">
          แสดง {vehicles.length} จากทั้งหมด {total.toLocaleString("th-TH")} รายการ
        </div>
      </div>
    </div>
  );
}
