import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { User, Lock, Eye, EyeOff, Phone } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/axios';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [showPass, setShowPass] = useState(false);
    const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            role: 'DRIVER'
        }
    });

    const onSubmit = async (data) => {
        try {
            await api.post('/auth/register', data);
            toast.success('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
            navigate('/login');
        } catch (err) {
            toast.error(err.response?.data?.message || 'สมัครสมาชิกไม่สำเร็จ');
        }
    };

    const password = watch('password');

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-slate-300">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100 my-8">
                <div className="bg-[#8A1ABA] pt-8 pb-6 px-8 text-center">
                    <div className="mx-auto mb-3 flex items-center justify-center">
                        <img src="/logo.png" alt="Logo" className="w-28 h-28 object-contain drop-shadow-md" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">สมัครสมาชิกใหม่</h1>
                    <p className="text-purple-100 text-sm">ระบบบริหารซ่อมบำรุงหน่วยยานพาหนะ</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-นามสกุล</label>
                            <div className="relative">
                                <User size={16} className="absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input {...register('full_name', { required: 'กรุณากรอกชื่อ-นามสกุล' })}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors"
                                    placeholder="นายทดสอบ ระบบ" />
                            </div>
                            {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                            <div className="relative">
                                <Phone size={16} className="absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input {...register('phone', {
                                    required: 'กรุณากรอกเบอร์โทรศัพท์',
                                    pattern: {
                                        value: /^0\d{9}$/,
                                        message: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักและขึ้นต้นด้วย 0'
                                    }
                                })}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors"
                                    placeholder="08XXXXXXXX" />
                            </div>
                            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อผู้ใช้งาน (Username)</label>
                            <div className="relative">
                                <User size={16} className="absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input {...register('username', {
                                    required: 'กรุณากรอกชื่อผู้ใช้',
                                    minLength: { value: 4, message: 'ขั้นต่ำ 4 ตัวอักษร' }
                                })}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors"
                                    placeholder="username" />
                            </div>
                            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่าน</label>
                            <div className="relative">
                                <Lock size={16} className="absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input {...register('password', {
                                    required: 'กรุณากรอกรหัสผ่าน',
                                    minLength: { value: 6, message: 'รหัสผ่านขั้นต่ำ 6 ตัวอักษร' }
                                })}
                                    type={showPass ? 'text' : 'password'}
                                    className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors"
                                    placeholder="••••••••" />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">ยืนยันรหัสผ่าน</label>
                            <div className="relative">
                                <Lock size={16} className="absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input {...register('confirmPassword', {
                                    required: 'กรุณายืนยันรหัสผ่าน',
                                    validate: value => value === password || 'รหัสผ่านไม่ตรงกัน'
                                })}
                                    type={showPass ? 'text' : 'password'}
                                    className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors"
                                    placeholder="••••••••" />
                            </div>
                            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
                        </div>


                        <button type="submit" disabled={isSubmitting}
                            className="w-full flex justify-center py-2.5 px-4 mt-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#8A1ABA] hover:bg-[#72159c] disabled:opacity-60 transition-colors">
                            {isSubmitting ? 'กำลังสมัครสมาชิก...' : 'ยืนยันการสมัคร'}
                        </button>
                    </form>
                </div>

                <div className="bg-slate-50 border-t border-slate-200 p-4 text-center">
                    <p className="text-sm text-slate-600">
                        มีบัญชีอยู่แล้ว?{' '}
                        <button type="button" onClick={() => navigate('/login')} className="text-blue-600 font-semibold hover:underline">
                            เข้าสู่ระบบ
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
