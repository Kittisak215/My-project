import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
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
        if (!selectedVehicle) return toast.error('ไม่มียานพาหนะ');
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
                const fd = new FormData(); fd.append('receipt', file);
                await api.post(`/repairs/${res.data.request_id || res.data.id}/receipt`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            }
            toast.success('แจ้งซ่อมสำเร็จ!');
            reset(); setFile(null); if (fileRef.current) fileRef.current.value = '';
        } catch (err) { toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด'); }
        setSubmitting(false);
    };

    const repairType = watch('repairType');
    const isEmergency = repairType === 'ซ่อมฉุกเฉิน';

    return (
        <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">🔧 แจ้งซ่อม / เบิกฉุกเฉิน</h1>

            {!selectedVehicle ? (
                <div className="bg-white rounded-xl p-8 text-center text-slate-400 border">ไม่มียานพาหนะ</div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="bg-slate-50 p-3 rounded-lg mb-6 text-sm">
                        <p className="text-slate-500 text-xs font-medium uppercase">ยานพาหนะที่แจ้ง</p>
                        <p className="font-semibold text-slate-800">{selectedVehicle.license_plate}</p>
                        <p className="text-slate-500">{selectedVehicle.brand} {selectedVehicle.model} | ไมล์ {(selectedVehicle.current_mileage || selectedVehicle.currentMileage || 0).toLocaleString()} กม.</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div>
                            <label className="text-sm font-medium text-slate-700">ประเภทการแจ้ง</label>
                            <div className="mt-2 grid grid-cols-2 gap-3">
                                {['ซ่อมทั่วไป', 'ซ่อมฉุกเฉิน'].map(type => (
                                    <label key={type} className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${repairType === type ? type === 'ซ่อมทั่วไป' ? 'border-teal-500 bg-teal-50' : 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input {...register('repairType')} type="radio" value={type} className="sr-only" />
                                        <span className="text-2xl">{type === 'ซ่อมทั่วไป' ? '🔧' : '🚨'}</span>
                                        <p className={`text-sm font-medium mt-1 ${repairType === type ? type === 'ซ่อมทั่วไป' ? 'text-teal-700' : 'text-red-700' : 'text-slate-700'}`}>{type}</p>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700">อาการและปัญหา *</label>
                            <textarea {...register('description', { required: 'กรุณาอธิบายปัญหา' })} rows={4}
                                placeholder="อธิบายอาการ เช่น เสียงดังผิดปกติ, ไฟแจ้งเตือน, ยางระเบิด..."
                                className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 resize-none" />
                            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
                        </div>

                        {isEmergency && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <p className="text-red-700 font-medium text-sm mb-3">🚨 การเบิกค่าใช้จ่ายฉุกเฉิน (จะส่งรออนุมัติจากผู้บริหาร)</p>
                                <div><label className="text-sm font-medium text-slate-700">ยอดเงินสำรองจ่าย (บาท)</label>
                                    <input {...register('estimatedCost', { valueAsNumber: true })} type="number" step="0.01"
                                        className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400" /></div>
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-medium text-slate-700">แนบเอกสาร/รูปถ่าย</label>
                            <input type="file" ref={fileRef} accept=".jpg,.jpeg,.png,.pdf" onChange={e => setFile(e.target.files[0])}
                                className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            <p className="text-xs text-slate-500 mt-1">รองรับ JPG, PNG, PDF ขนาดไม่เกิน 5MB</p>
                        </div>

                        <button type="submit" disabled={submitting}
                            className={`w-full py-3 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-60 ${isEmergency ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'}`}>
                            {submitting ? 'กำลังส่ง...' : isEmergency ? '🚨 ส่งคำขอเบิกฉุกเฉิน' : '🔧 ส่งคำร้องซ่อม'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
