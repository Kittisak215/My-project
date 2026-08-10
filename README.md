# V-Maintenance (ระบบบริหารซ่อมบำรุงยานพาหนะ)

ระบบเว็บแอปพลิเคชันสำหรับบริหารจัดการและติดตามสถานะการซ่อมบำรุงยานพาหนะขององค์กรแบบครบวงจร ช่วยแจ้งเตือนรอบการบำรุงรักษา (เปลี่ยนน้ำมันเครื่อง, เปลี่ยนยาง) และบันทึกประวัติการส่งซ่อมพร้อมแนบหลักฐานใบเสร็จ

---

## 🚀 ฟีเจอร์หลัก (Features)
- **Dashboard สรุปข้อมูลภาพรวม**: แสดงจำนวนรถพร้อมใช้งาน, รถที่อยู่ระหว่างซ่อม, รายการขอซ่อมรออนุมัติ และสถิติค่าใช้จ่ายในการซ่อมบำรุง
- **จัดการข้อมูลยานพาหนะ (Vehicle Management)**: บันทึกประวัติ รายละเอียดรถ เลขไมล์ และสถานะของรถแต่ละคัน
- **ระบบแจ้งเตือนการบำรุงรักษา (Maintenance Alerts)**: แจ้งเตือนอัตโนมัติเมื่อครบกำหนดระยะทางสำหรับการเปลี่ยนถ่ายน้ำมันเครื่องหรือเปลี่ยนยาง
- **แจ้งซ่อมและติดตามสถานะ (Repair Requests)**: คนขับสามารถแจ้งซ่อม ระบุปัญหา อัปโหลดรูปภาพใบเสร็จ และส่งให้ผู้ดูแลระบบ (Admin) ตรวจสอบและอนุมัติ
- **จัดการข้อมูลคนขับและอู่บริการ (Driver & Garage Management)**: รวบรวมรายชื่อผู้ขับขี่และอู่ซ่อมบำรุงพร้อมความเชี่ยวชาญเฉพาะทาง

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

### **Frontend (Client)**
- **Core**: React 19 + Vite
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Form Handling**: React Hook Form
- **Routing**: React Router DOM v7
- **Alerts**: React Toastify

### **Backend (Server)**
- **Core**: Node.js + Express
- **Database ORM**: Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens) & bcryptjs (Hashing)
- **File Upload**: Multer

---

## 📦 วิธีการติดตั้งและรันในเครื่อง (Setup & Installation)

### **สิ่งที่ต้องเตรียม (Prerequisites)**
- Node.js (เวอร์ชัน 18 ขึ้นไป)
- PostgreSQL Database

---

### **1. ตั้งค่าฝั่ง Backend (Server)**
1. เข้าไปที่โฟลเดอร์ server:
   ```bash
   cd server
   ```
2. ติดตั้ง Dependencies:
   ```bash
   npm install
   ```
3. คัดลอกไฟล์ `.env.example` และเปลี่ยนชื่อเป็น `.env` จากนั้นกรอกข้อมูลการเชื่อมต่อ PostgreSQL:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/your_database_name?schema=public"
   JWT_SECRET="your_jwt_secret_key"
   PORT=5001
   ```
4. รันคำสั่งสร้างตารางใน Database และสร้างข้อมูลจำลอง (Seed):
   ```bash
   # สร้างตารางข้อมูลผ่าน Script
   node prisma/setup_db.js
   
   # หรือรันผ่าน Prisma
   npx prisma migrate dev
   
   # ใส่ข้อมูลตัวอย่างสำหรับทดสอบระบบ
   node prisma/seed.js
   ```
5. รันเซิร์ฟเวอร์สำหรับพัฒนา:
   ```bash
   npm run dev
   ```

---

### **2. ตั้งค่าฝั่ง Frontend (Client)**
1. เข้าไปที่โฟลเดอร์ client:
   ```bash
   cd ../client
   ```
2. ติดตั้ง Dependencies:
   ```bash
   npm install
   ```
3. รันระบบหน้าบ้าน:
   ```bash
   npm run dev
   ```
   ระบบจะทำงานที่ลิงก์ [http://localhost:5173](http://localhost:5173)

---

## 🔑 บัญชีเข้าใช้งานสำหรับทดสอบ (Test Accounts)
สามารถใช้บัญชีเริ่มต้นในการเข้าสู่ระบบเพื่อทดสอบระบบได้ดังนี้ (กำหนดจาก `seed.js`):
- **Admin**: Username: `admin` | Password: `123456`
- **Executive**: Username: `exec` | Password: `123456`
- **Driver**: Username: `driver` | Password: `123456`
