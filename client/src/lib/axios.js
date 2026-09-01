import axios from 'axios';

const api = axios.create({
    // ให้มันอ่าน URL จาก Environment Variable ถ้ามี ไม่งั้นใช้ /api สำหรับตอน dev
    baseURL: import.meta.env.VITE_API_URL || '/api', 
});


api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const message = error.response?.data?.message || '';

        // 401 = ไม่มี token หรือ token หมดอายุ → ออกจากระบบ
        // 403 + ข้อความเกี่ยวกับ token → token ไม่ valid → ออกจากระบบ
        // 403 + ข้อความเกี่ยวกับ role → แค่ reject error ธรรมดา ไม่ logout
        const isTokenError =
            status === 401 ||
            (status === 403 && (
                message.toLowerCase().includes('token') ||
                message.toLowerCase().includes('expired')
            ));

        if (isTokenError) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // ล้าง Zustand state ด้วย
            try {
                localStorage.removeItem('auth-storage');
            // eslint-disable-next-line no-empty
            } catch {}
            // หลีกเลี่ยงการ redirect ซ้ำ
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api;
