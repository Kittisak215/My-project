import clsx from "clsx";

export default function StatusBadge({ status, type = "repair", className = "" }) {
  if (type === "repair") {
    const config = {
      PENDING: {
        label: "รอตรวจสอบ",
        color: "bg-amber-50 text-amber-700 border-amber-200/80",
        dot: "bg-amber-500",
      },
      IN_PROGRESS: {
        label: "กำลังดำเนินการ",
        color: "bg-sky-50 text-sky-700 border-sky-200/80",
        dot: "bg-sky-500",
      },
      AWAITING_APPROVAL: {
        label: "รออนุมัติ",
        color: "bg-purple-50 text-[#8A1ABA] border-purple-200/80",
        dot: "bg-[#8A1ABA]",
      },
      APPROVED: {
        label: "อนุมัติแล้ว",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        dot: "bg-emerald-500",
      },
      REJECTED: {
        label: "ไม่อนุมัติ",
        color: "bg-red-50 text-red-700 border-red-200/80",
        dot: "bg-red-500",
      },
      COMPLETED: {
        label: "ซ่อมเสร็จสิ้น",
        color: "bg-emerald-50 text-emerald-800 border-emerald-200/90",
        dot: "bg-emerald-600",
      },
    };

    const current = config[status] || {
      label: status,
      color: "bg-slate-100 text-slate-600 border-slate-200/80",
      dot: "bg-slate-400",
    };

    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
          current.color,
          className,
        )}
      >
        <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", current.dot)} aria-hidden="true" />
        {current.label}
      </span>
    );
  }

  if (type === "vehicle") {
    const config = {
      READY: {
        label: "พร้อมใช้งาน",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        dot: "bg-emerald-500",
      },
      IN_REPAIR: {
        label: "กำลังซ่อม",
        color: "bg-amber-50 text-amber-700 border-amber-200/80",
        dot: "bg-amber-500",
      },
    };

    const current = config[status] || {
      label: status,
      color: "bg-slate-100 text-slate-600 border-slate-200/80",
      dot: "bg-slate-400",
    };

    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
          current.color,
          className,
        )}
      >
        <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", current.dot)} aria-hidden="true" />
        {current.label}
      </span>
    );
  }

  if (type === "alert") {
    const config = {
      OVERDUE: {
        label: "เลยกำหนด",
        color: "bg-red-50 text-red-700 border-red-200/80",
        dot: "bg-red-500",
      },
      UPCOMING: {
        label: "ใกล้ถึงกำหนด",
        color: "bg-amber-50 text-amber-700 border-amber-200/80",
        dot: "bg-amber-500",
      },
      DONE: {
        label: "ดำเนินการแล้ว",
        color: "bg-slate-100 text-slate-600 border-slate-200/80",
        dot: "bg-slate-400",
      },
    };

    const current = config[status] || {
      label: status,
      color: "bg-slate-100 text-slate-600 border-slate-200/80",
      dot: "bg-slate-400",
    };

    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
          current.color,
          className,
        )}
      >
        <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", current.dot)} aria-hidden="true" />
        {current.label}
      </span>
    );
  }

  return null;
}
