import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Car, Users, Wrench, Building2, Bell, CheckSquare, LogOut, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import api from '../lib/axios';
import clsx from 'clsx';

const navItems = [
    { to: '/admin', label: 'หน้าหลัก', icon: LayoutDashboard, end: true },
    { to: '/admin/vehicles', label: 'ยานพาหนะ', icon: Car },
    { to: '/admin/drivers', label: 'ผู้รับผิดชอบ (พขร.)', icon: Users },
    { to: '/admin/garages', label: 'ศูนย์บริการ/อู่', icon: Building2 },
    { to: '/admin/repairs', label: 'คำร้องซ่อม', icon: Wrench },
    { to: '/admin/approvals', label: 'อนุมัติงบพิเศษ', icon: CheckSquare },
    { to: '/admin/alerts', label: 'การแจ้งเตือน', icon: Bell },
    { to: '/admin/users', label: 'ผู้ใช้งานระบบ', icon: Users },
];

export default function AdminLayout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [alertCount, setAlertCount] = useState(0);
    const [hasUnreadAlerts, setHasUnreadAlerts] = useState(false);

    // Fetch alerts count and check if unread
    useEffect(() => {
        let isMounted = true;
        const fetchAlertCount = () => {
            api.get('/alerts')
                .then(res => {
                    if (!isMounted) return;
                    const unresolved = res.data.filter(a => !a.is_resolved);
                    const count = unresolved.length;
                    setAlertCount(count);

                    const lastSeenCount = localStorage.getItem('last_seen_alerts_count');
                    const isAlertPage = location.pathname === '/admin/alerts';

                    if (isAlertPage) {
                        localStorage.setItem('last_seen_alerts_count', count.toString());
                        setHasUnreadAlerts(false);
                    } else if (count > 0 && lastSeenCount !== count.toString()) {
                        setHasUnreadAlerts(true);
                    } else {
                        setHasUnreadAlerts(false);
                    }
                })
                .catch(() => {});
        };

        fetchAlertCount();

        let socketInstance;
        import('socket.io-client').then(({ io }) => {
            if (!isMounted) return;
            const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5001';
            socketInstance = io(socketUrl, { withCredentials: true });
            
            socketInstance.on('new_notification', () => {
                fetchAlertCount();
            });
        });

        return () => { 
            isMounted = false; 
            if (socketInstance) socketInstance.disconnect();
        };
    }, [location.pathname]);

    // Handle clicking the alerts nav
    const handleAlertsClick = () => {
        localStorage.setItem('last_seen_alerts_count', alertCount.toString());
        setHasUnreadAlerts(false);
        setSidebarOpen(false);
    };

    const handleLogout = () => { logout(); navigate('/login'); };
    const displayName = user?.full_name || user?.username || 'Admin';
    const initial = displayName.charAt(0).toUpperCase();

    return (
        <div className="bg-slate-100 flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className={clsx(
                'w-64 bg-[#8A1ABA] text-white flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:relative md:translate-x-0 shadow-lg md:shadow-none',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <div className="h-20 flex items-center justify-center px-4 border-b border-white/20 shrink-0">
                    <img src="/logo.png" alt="Logo" className="h-14 w-auto object-contain drop-shadow-sm" />
                </div>
                <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
                    {navItems.map((item) => {
                        const ItemIcon = item.icon;
                        const isAlertNav = item.to === '/admin/alerts';
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                onClick={isAlertNav ? handleAlertsClick : () => setSidebarOpen(false)}
                                className={({ isActive }) => clsx(
                                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all relative group',
                                    isActive ? 'bg-white/20 text-white font-semibold shadow-xs backdrop-blur-xs' : 'text-white/80 hover:bg-white/10 hover:text-white'
                                )}
                            >
                                <ItemIcon size={18} className="shrink-0" />
                                <span className="flex-1 truncate">{item.label}</span>

                                {/* Red notification badge after text */}
                                {isAlertNav && hasUnreadAlerts && alertCount > 0 && (
                                    <span className="flex items-center gap-1.5 ml-auto shrink-0">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                        </span>
                                        <span className="bg-rose-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full shadow-xs leading-none">
                                            {alertCount}
                                        </span>
                                    </span>
                                )}
                            </NavLink>
                        );
                    })}
                    <hr className="border-white/15 my-4" />
                    <button onClick={handleLogout} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-white/90 hover:bg-white/10 hover:text-red-200 w-full transition-colors font-medium">
                        <LogOut size={18} /> ออกจากระบบ
                    </button>
                </nav>
            </aside>

            {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
                <header className="h-20 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] flex items-center justify-between px-6 z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-slate-500 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100">
                            <Menu size={22} />
                        </button>
                        <div className="hidden sm:block">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#8A1ABA]"></span>
                                <h2 className="text-base md:text-lg font-bold text-slate-800 tracking-tight">ระบบบริหารซ่อมบำรุงหน่วยยานพาหนะ</h2>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">มหาวิทยาลัยราชภัฏบุรีรัมย์</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                        {/* Header Notification Bell */}
                        <NavLink
                            to="/admin/alerts"
                            onClick={handleAlertsClick}
                            className="relative p-2.5 rounded-xl text-slate-500 hover:text-[#8A1ABA] hover:bg-purple-50 transition-all border border-slate-200/70 shadow-2xs"
                            title="การแจ้งเตือน"
                        >
                            <Bell size={19} />
                            {hasUnreadAlerts && alertCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-rose-500 text-[10px] font-bold text-white shadow-2xs leading-none">
                                        {alertCount}
                                    </span>
                                </span>
                            )}
                        </NavLink>

                        {/* User Profile Pill */}
                        <div className="flex items-center gap-3 pl-3.5 pr-2 py-1.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-bold text-slate-800 leading-tight">{displayName}</p>
                                <span className="inline-flex items-center text-[10px] font-medium text-[#8A1ABA] bg-purple-100/80 px-2 py-0.5 rounded-md mt-0.5">
                                    ผู้ดูแลระบบ (Admin)
                                </span>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-[#8A1ABA] to-[#b334ee] text-white flex items-center justify-center font-bold text-sm shadow-xs ring-2 ring-purple-100">
                                {initial}
                            </div>
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
