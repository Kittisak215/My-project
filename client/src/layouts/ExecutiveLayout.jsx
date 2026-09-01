import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, Car, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import useAuthStore from "../store/authStore";
import clsx from "clsx";

const navItems = [
  {
    to: "/executive",
    label: "ภาพรวมผู้บริหาร",
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: "/executive/expense-report",
    label: "รายงานค่าใช้จ่าย",
    icon: FileText,
  },
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
    <div className="bg-slate-100 flex h-screen overflow-hidden print:h-auto print:overflow-visible print:bg-white">
      <aside
        className={clsx(
          "w-64 bg-[#8A1ABA] text-white flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:relative md:translate-x-0 shadow-lg md:shadow-none print:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-20 flex items-center justify-center px-4 border-b border-white/20 shrink-0">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-14 w-auto object-contain drop-shadow-sm"
          />
        </div>
        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all",
                  isActive
                    ? "bg-white/20 text-white font-semibold shadow-xs backdrop-blur-xs"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                )
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
          <hr className="border-white/15 my-4" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-white/80 hover:bg-white/10 hover:text-white active:bg-white/20 w-full transition-all font-medium"
          >
            <LogOut size={18} /> ออกจากระบบ
          </button>
        </nav>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden print:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 print:h-auto print:overflow-visible">
        <header className="h-20 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] flex items-center justify-between px-6 z-40 shrink-0 print:!hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-slate-500 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100"
            >
              <Menu size={22} />
            </button>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8A1ABA]"></span>
                <h2 className="text-base md:text-lg font-bold text-slate-800 tracking-tight">
                  ระบบบริหารซ่อมบำรุงหน่วยยานพาหนะ
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                มหาวิทยาลัยราชภัฏบุรีรัมย์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-3 pl-3.5 pr-2 py-1.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {displayName}
                </p>
                <span className="inline-flex items-center text-[10px] font-medium text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md mt-0.5">
                  ผู้บริหาร (Executive)
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#8A1ABA] text-white flex items-center justify-center font-bold text-sm shadow-xs ring-2 ring-[#8A1ABA]/20">
                {initial}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-4 md:p-6 print:overflow-visible print:bg-white print:p-0 print:m-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
