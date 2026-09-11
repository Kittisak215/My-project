import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyRound, Lock, User, Save, Phone } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import api from '../../lib/axios';
import { toast } from 'react-toastify';
import clsx from 'clsx';
import { formatPhone } from '../../utils/format';

export default function ProfilePage() {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm();

    const onSubmit = async (data) => {
        if (data.new_password !== data.confirm_password) {
            toast.error('รหัสผ่านใหม่ไม่ตรงกัน');
            return;
        }

        setLoading(true);
        try {
            await api.put('/auth/change-password', {
                current_password: data.current_password,
                new_password: data.new_password
            });
            toast.success('เปลี่ยนรหัสผ่านสำเร็จ');
            reset();
        } catch (err) {
            toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
        } finally {
            setLoading(false);
        }
    };

    const displayName = user?.full_name || user?.driver?.full_name || '-';
    const displayPhone = formatPhone(user?.driver?.phone || user?.phone);
    const displayUsername = user?.username || '-';

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                    <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                        <User size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">ข้อมูลบัญชีผู้ใช้</h2>
                        <p className="text-xs text-slate-500 mt-0.5">ข้อมูลส่วนตัวของคุณ (ไม่สามารถแก้ไขได้ กรุณาติดต่อแอดมินหากต้องการเปลี่ยนแปลง)</p>
                    </div>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">ชื่อผู้ใช้งาน (Username)</label>
                        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium">
                            {displayUsername}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">ชื่อ-นามสกุล</label>
                        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium flex items-center gap-2">
                            {displayName}
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">เบอร์โทรศัพท์</label>
                        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium flex items-center gap-2">
                            <Phone size={16} className="text-slate-400" />
                            {displayPhone}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                    <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl">
                        <KeyRound size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">เปลี่ยนรหัสผ่าน</h2>
                        <p className="text-xs text-slate-500 mt-0.5">แนะนำให้ตั้งรหัสผ่านที่คาดเดาได้ยากและไม่ซ้ำกับระบบอื่น</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">รหัสผ่านปัจจุบัน</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="password" 
                                {...register('current_password', { required: 'กรุณากรอกรหัสผ่านปัจจุบัน' })}
                                className={clsx(
                                    "w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8A1ABA]/20 transition-all",
                                    errors.current_password ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-[#8A1ABA]"
                                )}
                                placeholder="••••••••"
                            />
                        </div>
                        {errors.current_password && <p className="text-xs text-red-500 mt-1.5">{errors.current_password.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">รหัสผ่านใหม่</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="password" 
                                    {...register('new_password', { 
                                        required: 'กรุณากรอกรหัสผ่านใหม่',
                                        minLength: { value: 6, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }
                                    })}
                                    className={clsx(
                                        "w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8A1ABA]/20 transition-all",
                                        errors.new_password ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-[#8A1ABA]"
                                    )}
                                    placeholder="••••••••"
                                />
                            </div>
                            {errors.new_password && <p className="text-xs text-red-500 mt-1.5">{errors.new_password.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">ยืนยันรหัสผ่านใหม่</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="password" 
                                    {...register('confirm_password', { required: 'กรุณายืนยันรหัสผ่านใหม่' })}
                                    className={clsx(
                                        "w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8A1ABA]/20 transition-all",
                                        errors.confirm_password ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-[#8A1ABA]"
                                    )}
                                    placeholder="••••••••"
                                />
                            </div>
                            {errors.confirm_password && <p className="text-xs text-red-500 mt-1.5">{errors.confirm_password.message}</p>}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={loading || !isDirty}
                            className="bg-[#8A1ABA] hover:bg-[#72159c] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            บันทึกรหัสผ่านใหม่
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
