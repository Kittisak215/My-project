import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Car, Users, Wrench, Building2, Bell, CheckSquare, LogOut, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import api from '../lib/axios';
import clsx from 'clsx';

const navItems = [
    { to: '/admin', label: 'หน้าหลัก', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'ผู้ใช้งานระบบ', icon: Users },
    { to: '/admin/vehicles', label: 'ยานพาหนะ', icon: Car },
    { to: '/admin/drivers', label: 'ผู้รับผิดชอบ (พขร.)', icon: Users },
    { to: '/admin/repairs', label: 'คำร้องซ่อม', icon: Wrench },
    { to: '/admin/approvals', label: 'อนุมัติงบพิเศษ', icon: CheckSquare },
    { to: '/admin/garages', label: 'ศูนย์บริการ/อู่', icon: Building2 },
    { to: '/admin/alerts', label: 'การแจ้งเตือน', icon: Bell },
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

        return () => { isMounted = false; };
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
                'w-64 bg-[#8A1ABA] text-white flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:relative md:translate-x-0',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <div className="h-28 flex items-center justify-center border-b border-white/20 shrink-0">
                    <img src="/logo.png" alt="Logo" className="h-20 w-auto object-contain" />
                </div>
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
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
                                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors relative group',
                                    isActive ? 'bg-white/20 text-white font-medium shadow-sm' : 'text-white/80 hover:bg-white/10'
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
                                        <span className="bg-rose-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full shadow-sm leading-none">
                                            {alertCount}
                                        </span>
                                    </span>
                                )}
                            </NavLink>
                        );
                    })}
                    <hr className="border-white/20 my-4" />
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-white/90 hover:bg-white/10 hover:text-red-300 w-full transition-colors">
                        <LogOut size={18} /> ออกจากระบบ
                    </button>
                </nav>
            </aside>

            {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
                <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-10 shrink-0">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-slate-500 hover:text-slate-700">
                        <Menu size={22} />
                    </button>
                    <h2 className="text-xl font-semibold text-slate-800 hidden md:block">ระบบบริหารซ่อมบำรุงหน่วยยานพาหนะ</h2>
                    <div className="flex items-center space-x-3 ml-auto">
                        {/* Header Notification Bell */}
                        <NavLink
                            to="/admin/alerts"
                            onClick={handleAlertsClick}
                            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="การแจ้งเตือน"
                        >
                            <Bell size={20} />
                            {hasUnreadAlerts && alertCount > 0 && (
                                <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                                </span>
                            )}
                        </NavLink>

                        <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">{initial}</div>
                        <span className="text-sm font-medium text-slate-700 hidden sm:block">{displayName}</span>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
