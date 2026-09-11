import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import api from "../../lib/axios";
import { toast } from "react-toastify";
import clsx from "clsx";
import Skeleton from "../../components/Skeleton";
import { formatPhone } from "../../utils/format";

const StatusBadge = ({ vehicle }) => {
  if (vehicle?.is_active === false) {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap bg-slate-100 text-slate-600 border-slate-200">
        ⚫ ปลดระวาง
      </span>
    );
  }
  const status = vehicle?.status;
  const map = {
    READY: "bg-green-100 text-green-700 border-green-200",
    IN_REPAIR: "bg-amber-100 text-amber-700 border-amber-200",
  };
  const label = { READY: "🟢 พร้อมใช้งาน", IN_REPAIR: "🛠️ กำลังซ่อม" };
  return (
    <span
      className={clsx(
        "px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap",
        map[status] || "bg-slate-100 text-slate-600 border-slate-200",
      )}
    >
      {label[status] || status}
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
    api
      .get("/vehicles", { params: { search, status, limit: 50 } })
      .then((res) => {
        setVehicles(res.data.data);
        setTotal(res.data.total);
      })
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [search, status]);

  const readyCount = vehicles.filter((v) => v.status === "READY").length;
  const thisYear = new Date().getFullYear();

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-semibold text-slate-800 mb-4 md:mb-6">
        ทำเนียบและสถานะทรัพย์สินยานพาหนะ
      </h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-6">
        <div className="bg-white rounded-xl shadow-sm p-3 md:p-5 border border-slate-200">
          <p className="text-xs md:text-sm text-slate-500 font-medium mb-1">
            จำนวนรถในความดูแล
          </p>
          <p className="text-xl md:text-3xl font-bold text-slate-800">
            {total}{" "}
            <span className="text-xs md:text-sm text-slate-500">คัน</span>
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 md:p-5 border border-slate-200">
          <p className="text-xs md:text-sm text-slate-500 font-medium mb-1">
            สถานะพร้อมใช้งาน
          </p>
          <p className="text-xl md:text-3xl font-bold text-slate-800">
            {readyCount}{" "}
            <span className="text-xs md:text-sm text-slate-500">คัน</span>
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 md:p-5 border border-slate-200">
          <p className="text-xs md:text-sm text-slate-500 font-medium mb-1">
            อัตราพร้อมใช้งาน
          </p>
          <p className="text-xl md:text-3xl font-bold text-slate-800">
            {total > 0 ? Math.round((readyCount / total) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <div className="relative flex-1 sm:flex-none">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLoading(true);
              }}
              placeholder="ค้นหาป้ายทะเบียน, รุ่น..."
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-full sm:w-56 focus:outline-none focus:border-amber-500"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setLoading(true);
            }}
            className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500"
          >
            <option value="">ทุกสถานะ</option>
            <option value="READY">พร้อมใช้งาน</option>
            <option value="IN_REPAIR">กำลังซ่อม</option>
            <option value="INACTIVE">ปลดระวาง</option>
          </select>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3 mb-4">
        {loading && (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}
        {!loading && vehicles.length === 0 && (
          <p className="text-center py-8 text-slate-400">ไม่พบข้อมูล</p>
        )}
        {vehicles.map((v, i) => (
          <div
            key={v.vehicle_id || v.id}
            className={clsx(
              "bg-white rounded-xl border border-slate-200 p-4 shadow-sm",
              v.status === "IN_REPAIR" && "bg-red-50/20",
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-800 text-base">
                    {v.license_plate}
                  </p>
                  <StatusBadge vehicle={v} />
                </div>
                <p className="text-xs text-slate-500">
                  {v.vehicleType?.type_name || v.type}
                </p>
              </div>
              <span className="text-xs text-slate-400">#{i + 1}</span>
            </div>
            <p className="text-sm text-slate-700 font-medium">
              {v.brand} {v.model}
            </p>
            <p className="text-xs text-slate-400">
              สี{v.color} | อายุ {thisYear - v.year} ปี ({v.year})
            </p>
            <div className="flex items-center justify-between mt-2">
              <div>
                <p className="text-xs text-slate-500">
                  {v.driver?.full_name || "-"}
                </p>
                <p className="text-xs text-slate-400 font-mono">
                  {formatPhone(v.driver?.phone)}
                </p>
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {(v.current_mileage || v.currentMileage || 0).toLocaleString()}{" "}
                กม.
              </p>
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
                <th className="px-6 py-4 font-semibold text-center w-14">
                  ลำดับ
                </th>
                <th className="px-6 py-4 font-semibold">
                  ป้ายทะเบียน / ประเภท
                </th>
                <th className="px-6 py-4 font-semibold">
                  ยี่ห้อ / รุ่น / ปีที่ซื้อ
                </th>
                <th className="px-6 py-4 font-semibold">ผู้รับผิดชอบ</th>
                <th className="px-6 py-4 font-semibold text-right">
                  ไมล์สะสม (กม.)
                </th>
                <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <>
                  {[1, 2, 3].map((item) => (
                    <tr key={`sk-${item}`}>
                      <td className="px-6 py-4">
                        <Skeleton className="h-5 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-5 w-32" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-5 w-24" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-5 w-20" />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Skeleton className="h-6 w-16 mx-auto rounded-full" />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Skeleton className="h-8 w-24 mx-auto rounded-lg" />
                      </td>
                    </tr>
                  ))}
                </>
              )}
              {!loading && vehicles.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              )}
              {vehicles.map((v, i) => (
                <tr
                  key={v.vehicle_id || v.id}
                  className={clsx(
                    "hover:bg-slate-50 transition-colors",
                    v.status === "IN_REPAIR" && "bg-red-50/20",
                  )}
                >
                  <td className="px-6 py-4 text-center text-slate-500">
                    {i + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 text-base">
                      {v.license_plate}
                    </div>
                    <div className="text-xs text-slate-500">
                      {v.vehicleType?.type_name || v.type}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-800 font-medium">
                      {v.brand} {v.model}
                    </div>
                    <div className="text-xs text-slate-500">
                      สี{v.color} | อายุ {thisYear - v.year} ปี ({v.year})
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {v.driver?.full_name || v.driver?.fullName || "-"}
                    <br />
                    <span className="text-xs text-slate-400 font-mono">
                      {formatPhone(v.driver?.phone)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-700">
                    {(
                      v.current_mileage ||
                      v.currentMileage ||
                      0
                    ).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge vehicle={v} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 text-sm text-slate-500">
          แสดง {vehicles.length} จากทั้งหมด {total} รายการ
        </div>
      </div>
    </div>
  );
}
