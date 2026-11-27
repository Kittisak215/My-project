import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, Car, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import useAuthStore from "../store/authStore";
import clsx from "clsx";

const navItems = [
  { to: "/executive", label: "ภาพรวมผู้บริหาร", icon: LayoutDashboard, end: true },
  { to: "/executive/expense-report", label: "รายงานค่าใช้จ่าย", icon: FileText },
  { to: "/executive/fleet-registry", label: "ทะเบียนรถทั้งหมด", icon: Car },
];

export default function ExecutiveLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const displayName = user?.full_name || user?.username || "Executive";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="bg-[#F5F1FA] flex h-screen overflow-hidden print:h-auto print:overflow-visible print:bg-white">
      <aside
        className={clsx(
          "w-64 bg-gradient-to-b from-[#6B1391] via-[#570F78] to-[#3B0954] text-white flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:relative md:translate-x-0 print:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/15 shrink-0">
          <div className="p-1 rounded-lg bg-white/15 border border-white/20 shrink-0">
            <img
              src="/logo.png"
              alt="ตรามหาวิทยาลัยราชภัฏบุรีรัมย์"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight truncate" translate="no">
              V-Maintenance
            </p>
            <p className="text-[11px] text-purple-200/80 truncate">สำหรับผู้บริหาร</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="เมนูหลักผู้บริหาร">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
                  isActive
                    ? "bg-white/20 text-white font-semibold border border-white/15"
                    : "text-purple-100/80 hover:bg-white/10 hover:text-white font-medium",
                )
              }
            >
              <Icon size={18} className="shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/15">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-purple-100/85 hover:bg-white/10 hover:text-white w-full transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 cursor-pointer"
          >
            <LogOut size={18} aria-hidden="true" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden print:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 print:h-auto print:overflow-visible">
        <header className="h-16 bg-white border-b border-purple-200/70 flex items-center justify-between px-4 md:px-6 z-40 shrink-0 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="เปิดเมนูนำทาง"
              className="md:hidden text-slate-600 hover:text-[#8A1ABA] p-2 rounded-lg hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] cursor-pointer"
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            <div className="hidden sm:block min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                ระบบบริหารซ่อมบำรุงหน่วยยานพาหนะ
              </p>
              <p className="text-xs text-[#8A1ABA]/80 truncate">
                มหาวิทยาลัยราชภัฏบุรีรัมย์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-2.5 pl-3 pr-2 py-1 rounded-xl bg-purple-50/70 border border-purple-200/60">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-900 leading-tight">
                  {displayName}
                </p>
                <p className="text-[11px] text-[#8A1ABA] font-medium">ผู้บริหาร</p>
              </div>
              <div
                className="w-8 h-8 rounded-lg bg-[#8A1ABA] text-white flex items-center justify-center font-semibold text-xs"
                aria-hidden="true"
              >
                {initial}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#F5F1FA] p-4 md:p-6 print:overflow-visible print:bg-white print:p-0 print:m-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
