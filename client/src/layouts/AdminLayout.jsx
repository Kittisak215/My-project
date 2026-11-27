import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Car,
  Users,
  Wrench,
  Building2,
  Bell,
  LogOut,
  Menu,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  Settings,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import useAuthStore from "../store/authStore";
import api from "../lib/axios";
import { getSocket } from "../lib/socket";
import clsx from "clsx";

const navItems = [
  { to: "/admin", label: "หน้าหลัก", icon: LayoutDashboard, end: true },
  { to: "/admin/vehicles", label: "ยานพาหนะ", icon: Car },
  { to: "/admin/vehicle-types", label: "ตั้งค่าประเภทรถ", icon: Settings },
  { to: "/admin/drivers", label: "ผู้รับผิดชอบ (พขร.)", icon: Users },
  { to: "/admin/garages", label: "ศูนย์บริการ/อู่", icon: Building2 },
  { to: "/admin/repairs", label: "คำร้องซ่อม", icon: Wrench },
  { to: "/admin/alerts", label: "เตือนบำรุงรักษา", icon: Bell },
  { to: "/admin/users", label: "ผู้ใช้งานระบบ", icon: Users },
];

function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("admin_dismissed_notifications") || "[]");
    } catch {
      return [];
    }
  });
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const visibleNotifications = notifications.filter(
    (n) => !dismissedIds.includes(n.id),
  );

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications/admin");
      const data = res.data.notifications || [];
      setNotifications(data);

      const dismissed = (() => {
        try {
          return JSON.parse(localStorage.getItem("admin_dismissed_notifications") || "[]");
        } catch {
          return [];
        }
      })();
      const visible = data.filter((n) => !dismissed.includes(n.id));

      const lastRead = localStorage.getItem("admin_last_read");
      let count = 0;
      if (!lastRead) count = visible.length;
      else {
        const lastReadTime = new Date(lastRead).getTime();
        count = visible.filter(
          (n) => new Date(n.created_at).getTime() > lastReadTime,
        ).length;
      }
      setUnreadCount(count);
    } catch {
      /* silent fail */
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDismiss = (e, id) => {
    e.stopPropagation();
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    localStorage.setItem("admin_dismissed_notifications", JSON.stringify(updated));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleDismissAll = (e) => {
    e.stopPropagation();
    const allIds = Array.from(new Set([...dismissedIds, ...notifications.map((n) => n.id)]));
    setDismissedIds(allIds);
    localStorage.setItem("admin_dismissed_notifications", JSON.stringify(allIds));
    setUnreadCount(0);
  };

  const handleToggle = () => {
    setOpen((prev) => {
      const willOpen = !prev;
      if (willOpen && unreadCount > 0) {
        localStorage.setItem("admin_last_read", new Date().toISOString());
        setUnreadCount(0);
      }
      return willOpen;
    });
  };

  useEffect(() => {
    fetchNotifications();
    const socket = getSocket();
    const onNewNotification = () => fetchNotifications();
    socket.on("new_notification", onNewNotification);
    return () => socket.off("new_notification", onNewNotification);
  }, [fetchNotifications]);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const iconMap = {
    success: <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />,
    warning: <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />,
    error: <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" aria-hidden="true" />,
    info: <Info size={16} className="text-sky-600 shrink-0 mt-0.5" aria-hidden="true" />,
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label="การแจ้งเตือนระบบ"
        aria-expanded={open}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A1ABA] cursor-pointer"
      >
        <Bell size={18} className={clsx(unreadCount > 0 && "text-[#8A1ABA]")} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white leading-none tabular-nums">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-lg border border-slate-200/90 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              การแจ้งเตือนระบบ
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200/70 px-1.5 py-0.5 rounded-full tabular-nums">
                  {unreadCount} ใหม่
                </span>
              )}
            </h3>
            {visibleNotifications.length > 0 && (
              <button
                type="button"
                onClick={handleDismissAll}
                className="text-xs text-slate-500 hover:text-[#8A1ABA] font-medium transition-colors px-2 py-1 rounded-md hover:bg-slate-200/50 cursor-pointer"
              >
                ล้างทั้งหมด
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto overscroll-contain divide-y divide-slate-100">
            {loading && visibleNotifications.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-sm">กำลังโหลด…</div>
            )}
            {!loading && visibleNotifications.length === 0 && (
              <div className="py-10 text-center text-slate-400 text-sm">
                <CheckCircle size={26} className="mx-auto mb-2 text-emerald-500" aria-hidden="true" />
                ไม่มีการแจ้งเตือน
              </div>
            )}
            {visibleNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  setOpen(false);
                  if (n.category === "REPAIR_STATUS")
                    navigate("/admin/repairs", { state: { openRequestId: n.data_id } });
                  else if (n.category === "MAINTENANCE")
                    navigate("/admin/alerts", { state: { openAlertId: n.data_id } });
                }}
                className="p-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                {iconMap[n.type] || iconMap.info}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900 leading-snug truncate">
                      {n.title}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => handleDismiss(e, n.id)}
                      aria-label="ปิดการแจ้งเตือนนี้"
                      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0 -mr-1 -mt-0.5 cursor-pointer"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
                    {new Date(n.created_at).toLocaleString("th-TH")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const displayName = user?.full_name || user?.username || "Admin";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="bg-[#F5F1FA] flex h-screen overflow-hidden print:h-auto print:overflow-visible print:bg-white">
      {/* Sidebar */}
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
            <p className="text-[11px] text-purple-200/80 truncate">มหาวิทยาลัยราชภัฏบุรีรัมย์</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="เมนูหลักผู้ดูแลระบบ">
          {navItems.map((item) => {
            const ItemIcon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
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
                <ItemIcon size={18} className="shrink-0" aria-hidden="true" />
                <span className="flex-1 truncate">{item.label}</span>
              </NavLink>
            );
          })}
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

      {/* Main Content */}
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
            <AdminNotificationBell />

            <div className="flex items-center gap-2.5 pl-3 pr-2 py-1 rounded-xl bg-purple-50/70 border border-purple-200/60">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-900 leading-tight">
                  {displayName}
                </p>
                <p className="text-[11px] text-[#8A1ABA] font-medium">ผู้ดูแลระบบ</p>
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
