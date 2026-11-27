import clsx from "clsx";

export default function Skeleton({ className }) {
  return (
    <div
      className={clsx(
        "rounded-xl bg-slate-200/70 animate-pulse motion-reduce:animate-none",
        className,
      )}
      aria-hidden="true"
    />
  );
}
