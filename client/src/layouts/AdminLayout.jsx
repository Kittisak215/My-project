import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Car, Users, Wrench, Building2, Bell, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import useAuthStore from '../store/authStore';
import clsx from 'clsx';

const navItems = [
    { to: '/admin', label: 'หน้าหลัก', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'ผู้ใช้งานระบบ', icon: Users },
    { to: '/admin/vehicles', label: 'ยานพาหนะ', icon: Car },
    { to: '/admin/drivers', label: 'ผู้รับผิดชอบ (พขร.)', icon: Users },
    { to: '/admin/repairs', label: 'คำร้องซ่อม', icon: Wrench },
    { to: '/admin/garages', label: 'ศูนย์บริการ/อู่', icon: Building2 },
    { to: '/admin/alerts', label: 'การแจ้งเตือน', icon: Bell },
];

export default function AdminLayout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
                    {navItems.map(({ to, label, icon: Icon, end }) => (
                        <NavLink key={to} to={to} end={end}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) => clsx(
                                'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors',
                                isActive ? 'bg-white/20 text-white font-medium shadow-sm' : 'text-white/80 hover:bg-white/10'
                            )}>
                            <Icon size={18} /> {label}
                        </NavLink>
                    ))}
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
