import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Car,
  Gauge,
  Wrench,
  History,
  LogOut,
  Menu,
  Bell,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  ChevronRight,
  User,
} from "lucide-react";
import useAuthStore from "../store/authStore";
import api from "../lib/axios";
import clsx from "clsx";

const navItems = [
  { to: "/driver", label: "รถของฉัน", icon: Car, end: true },
  { to: "/driver/mileage", label: "บันทึกระยะทาง", icon: Gauge },
  { to: "/driver/repair", label: "แจ้งซ่อม / เบิกฉุกเฉิน", icon: Wrench },
  { to: "/driver/history", label: "ประวัติการซ่อม", icon: History },
  { to: "/driver/profile", label: "จัดการบัญชี", icon: User },
];

// ──────────────────────────────────────────────────
// คอมโพเนนต์กระดิ่งแจ้งเตือน
// ──────────────────────────────────────────────────
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications/driver");
      const data = res.data.notifications || [];
      setNotifications(data);

      const lastRead = localStorage.getItem("driver_last_read");
      let count = 0;
      if (!lastRead) {
        count = data.length;
      } else {
        const lastReadTime = new Date(lastRead).getTime();
        count = data.filter(
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

  const handleToggle = () => {
    setOpen((prev) => {
      const willOpen = !prev;
      if (willOpen && unreadCount > 0) {
        // บันทึกเวลาที่เปิดอ่านล่าสุดลง LocalStorage
        localStorage.setItem("driver_last_read", new Date().toISOString());
        setUnreadCount(0);
      }
      return willOpen;
    });
  };

  // โหลดครั้งแรก + ต่อ WebSocket
  useEffect(() => {
    fetchNotifications();

    // เชื่อมต่อ Socket.io
    import("socket.io-client").then(({ io }) => {
      const socketUrl = import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/\/api$/, "")
        : "http://localhost:5001";
      const socket = io(socketUrl, { withCredentials: true });

      socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
      });

      socket.on("new_notification", () => {
        fetchNotifications();
        import("react-toastify").then(({ toast }) => {
          toast.info("มีการแจ้งเตือนใหม่", {
            position: "bottom-right",
            autoClose: 3000,
          });
        });
      });

      return () => {
        socket.disconnect();
      };
    });
  }, [fetchNotifications]);

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const iconMap = {
    success: (
      <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
    ),
    warning: (
      <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
    ),
    error: <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />,
    info: <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />,
  };
  const bgMap = {
    success: "bg-emerald-50 border-emerald-100",
    warning: "bg-amber-50 border-amber-100",
    error: "bg-red-50 border-red-100",
    info: "bg-blue-50 border-blue-100",
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* ปุ่มกระดิ่ง */}
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
        title="การแจ้งเตือน"
      >
        <Bell
          size={20}
          className={clsx(
            "transition-colors",
            unreadCount > 0 ? "text-[#8A1ABA]" : "text-slate-400",
          )}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1 shadow">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl shadow-purple-950/15 border border-purple-100/60 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Bell size={15} className="text-[#8A1ABA]" />
              การแจ้งเตือน
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                  {unreadCount} ใหม่
                </span>
              )}
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-sm">
                กำลังโหลด...
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-sm">
                <CheckCircle
                  size={28}
                  className="mx-auto mb-2 text-emerald-400"
                />
                ไม่มีการแจ้งเตือน
              </div>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                className={clsx(
                  "p-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors",
                  bgMap[n.type] || "bg-white",
                )}
              >
                {iconMap[n.type] || iconMap.info}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 leading-snug truncate">
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {n.body}
                  </p>
                  {n.category === "REPAIR_STATUS" && n.estimated_end_date && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      คาดเสร็จ:{" "}
                      {new Date(n.estimated_end_date).toLocaleDateString(
                        "th-TH",
                      )}
                    </p>
                  )}
                  {n.category === "MILEAGE_REMINDER" && (
                    <a
                      href="/driver/mileage"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-[#8A1ABA] hover:underline"
                    >
                      กรอกไมล์ตอนนี้ <ChevronRight size={11} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-center">
              <p className="text-[11px] text-slate-400">
                อัปเดตอัตโนมัติทุก 30 วินาที
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────
// Layout หลัก
// ──────────────────────────────────────────────────
export default function DriverLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  const displayName =
    user?.full_name || user?.driver?.full_name || user?.username || "Driver";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="bg-slate-50 flex h-screen overflow-hidden">
      <aside
        className={clsx(
          "w-64 bg-[#8A1ABA] text-white flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:relative md:translate-x-0 shadow-lg md:shadow-none",
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
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <header className="h-20 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] flex items-center justify-between px-6 z-40 shrink-0">
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
            {/* กระดิ่งแจ้งเตือน */}
            <NotificationBell />

            <div className="flex items-center gap-3 pl-3.5 pr-2 py-1.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {displayName}
                </p>
                <span className="inline-flex items-center text-[10px] font-medium text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md mt-0.5">
                  พนักงานขับรถ (Driver)
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#8A1ABA] text-white flex items-center justify-center font-bold text-sm shadow-xs ring-2 ring-[#8A1ABA]/20">
                {initial}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
