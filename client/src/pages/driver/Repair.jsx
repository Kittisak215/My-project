import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Wrench, Car, AlertTriangle, ShieldAlert, PhoneCall, UploadCloud, FileText } from 'lucide-react';
import api from '../../lib/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/authStore';

export default function DriverRepairPage() {
    const { user } = useAuthStore();
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [file, setFile] = useState(null);
    const fileRef = useRef(null);
    const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({ defaultValues: { repairType: 'ซ่อมทั่วไป' } });

    useEffect(() => {
        api.get('/vehicles', { params: { limit: 100 } }).then(res => {
            const driverId = user?.driver_id || user?.driver?.driver_id;
            const driverVehicles = res.data.data.filter(v => (v.driver_id || v.driverId) === driverId);
            setVehicles(driverVehicles);
            if (driverVehicles.length > 0) setSelectedVehicle(driverVehicles[0]);
        });
    }, []);

    const onSubmit = async (data) => {
        if (!selectedVehicle) return toast.error('ไม่มียานพาหนะที่ได้รับมอบหมาย');
        setSubmitting(true);
        try {
            const repairData = {
                vehicle_id: selectedVehicle.vehicle_id || selectedVehicle.id,
                repair_type: data.repairType === 'ซ่อมฉุกเฉิน' ? 'EMERGENCY' : 'GENERAL',
                issue_description: data.description,
                total_cost: data.estimatedCost ? parseFloat(data.estimatedCost) : undefined,
                mileage_at_repair: selectedVehicle.current_mileage || selectedVehicle.currentMileage || 0
            };
            if (data.repairType === 'ซ่อมฉุกเฉิน') repairData.status = 'AWAITING_APPROVAL';
            const res = await api.post('/repairs', repairData);

            if (file && (res.data.request_id || res.data.id)) {
                const fd = new FormData();
                fd.append('receipt', file);
                await api.post(`/repairs/${res.data.request_id || res.data.id}/receipt`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            toast.success('แจ้งซ่อมสำเร็จ!');
            reset();
            setFile(null);
            if (fileRef.current) fileRef.current.value = '';
        } catch (err) {
            toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการส่งคำขอ');
        }
        setSubmitting(false);
    };

    const repairType = watch('repairType');
    const isEmergency = repairType === 'ซ่อมฉุกเฉิน';

    return (
        <div className="w-full space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-100">
                        <Wrench size={26} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-800">แจ้งซ่อม / เบิกฉุกเฉิน</h1>
                        <p className="text-xs md:text-sm text-slate-500">ส่งคำขอเข้าซ่อมบำรุงหรือเบิกจ่ายเงินสำรองกรณีฉุกเฉิน</p>
                    </div>
                </div>
            </div>

            {!selectedVehicle ? (
                <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200 shadow-xs">
                    <Car size={48} className="mx-auto mb-3 text-slate-300" />
                    <p className="font-semibold text-slate-600">ยังไม่มียานพาหนะที่ได้รับมอบหมาย</p>
                    <p className="text-xs text-slate-400 mt-1">กรุณาติดต่อผู้ดูแลระบบ (Admin) เพื่อมอบหมายรถ</p>
                </div>
            ) : (
                /* 2-Column Grid Layout */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left Column: Form Card (7 cols) */}
                    <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 md:p-8">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            
                            {/* Type Selector */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                    ประเภทการแจ้ง *
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { type: 'ซ่อมทั่วไป', icon: '🔧', desc: 'แจ้งตามรอบ/อาการปกติ' },
                                        { type: 'ซ่อมฉุกเฉิน', icon: '🚨', desc: 'สำรองจ่าย/ฉุกเฉิน' }
                                    ].map(({ type, icon, desc }) => (
                                        <label
                                            key={type}
                                            className={`cursor-pointer border-2 rounded-2xl p-4 text-center transition-all relative ${
                                                repairType === type
                                                    ? type === 'ซ่อมทั่วไป'
                                                        ? 'border-teal-500 bg-teal-50/60 shadow-xs'
                                                        : 'border-red-500 bg-red-50/60 shadow-xs'
                                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                                            }`}
                                        >
                                            <input {...register('repairType')} type="radio" value={type} className="sr-only" />
                                            <span className="text-3xl block mb-1">{icon}</span>
                                            <p className={`text-sm font-bold ${
                                                repairType === type
                                                    ? type === 'ซ่อมทั่วไป' ? 'text-teal-800' : 'text-red-800'
                                                    : 'text-slate-700'
                                            }`}>
                                                {type}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Problem Description */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                    อาการและรายละเอียดปัญหา *
                                </label>
                                <textarea
                                    {...register('description', { required: 'กรุณาอธิบายปัญหา' })}
                                    rows={4}
                                    placeholder="อธิบายอาการ เช่น มีเสียงดังผิดปกติช่วงล่าง, ไฟเครื่องยนต์โชว์, ยางระเบิด..."
                                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                                />
                                {errors.description && (
                                    <p className="text-red-500 text-xs mt-1 font-medium">{errors.description.message}</p>
                                )}
                            </div>

                            {/* Emergency Extra Fields */}
                            {isEmergency && (
                                <div className="bg-red-50/80 border border-red-200 rounded-2xl p-5 space-y-3">
                                    <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                                        <ShieldAlert size={18} className="text-red-600 shrink-0" />
                                        <span>คำขอเบิกเงินสำรองจ่ายฉุกเฉิน</span>
                                    </div>
                                    <p className="text-xs text-red-600">รายการนี้จะถูกส่งไปให้ผู้บริหารตรวจสอบและอนุมัติยอดเงินย้อนหลัง</p>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            ยอดเงินสำรองจ่ายจริง (บาท) *
                                        </label>
                                        <input
                                            {...register('estimatedCost', { valueAsNumber: true })}
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* File Upload */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                    แนบรูปภาพ / ใบเสร็จรับเงิน
                                </label>
                                <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl p-4 text-center bg-slate-50/50">
                                    <UploadCloud size={28} className="mx-auto text-slate-400 mb-1" />
                                    <input
                                        type="file"
                                        ref={fileRef}
                                        accept=".jpg,.jpeg,.png,.pdf"
                                        onChange={e => setFile(e.target.files[0])}
                                        className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">รองรับ JPG, PNG, PDF ขนาดไม่เกิน 5MB</p>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className={`w-full py-3.5 rounded-xl text-white text-sm font-bold transition-all shadow-sm hover:shadow-md disabled:opacity-60 cursor-pointer ${
                                    isEmergency
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-teal-700 hover:bg-teal-800'
                                }`}
                            >
                                {submitting
                                    ? 'กำลังส่งคำขอ...'
                                    : isEmergency
                                    ? '🚨 ส่งคำขอเบิกเงินฉุกเฉิน'
                                    : '🔧 ส่งคำร้องแจ้งซ่อม'}
                            </button>
                        </form>
                    </div>

                    {/* Right Column: Vehicle Details & Hotline (5 cols) */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Vehicle Card */}
                        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>
                            
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">ยานพาหนะที่แจ้ง</p>
                            <h3 className="text-2xl font-bold text-white mb-1">{selectedVehicle.license_plate}</h3>
                            <p className="text-sm text-slate-300 mb-4">{selectedVehicle.brand} {selectedVehicle.model}</p>

                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-slate-400">เลขไมล์ปัจจุบัน</p>
                                    <p className="text-lg font-bold text-white mt-0.5">
                                        {(selectedVehicle.current_mileage || selectedVehicle.currentMileage || 0).toLocaleString()} กม.
                                    </p>
                                </div>
                                <Car size={24} className="text-slate-400" />
                            </div>
                        </div>

                        {/* Emergency Contact & Guidelines */}
                        <div className="bg-red-50/60 border border-red-200/80 rounded-2xl p-5 text-slate-700">
                            <h3 className="font-bold text-red-900 text-sm flex items-center gap-2 mb-2">
                                <PhoneCall size={18} className="text-red-600" /> ติดต่อฉุกเฉิน & อู่ซ่อมบริการ
                            </h3>
                            <p className="text-xs text-slate-600 leading-relaxed mb-3">
                                หากรถเสียกะทันหันกลางทาง กรุณาถ่ายภาพหลักฐาน ใบเสร็จ หรือติดต่อฝ่ายบริหารยานพาหนะก่อนเข้าอู่ซ่อม
                            </p>
                            <div className="bg-white rounded-xl p-3 border border-red-200 text-xs space-y-1 text-slate-800">
                                <p><strong>ฝ่ายบริหารยานพาหนะ:</strong> 02-123-4567</p>
                                <p><strong>ศูนย์ช่วยเหลือนอกสถานที่:</strong> 081-999-8888</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
