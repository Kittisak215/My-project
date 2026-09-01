import clsx from 'clsx';

function injectStyle(id, css) {
    if (typeof document !== 'undefined' && !document.getElementById(id)) {
        const el = document.createElement('style');
        el.id = id;
        el.textContent = css;
        document.head.appendChild(el);
    }
}

export default function Skeleton({ className }) {
    injectStyle('skeleton-anim', `
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
    `);
    
    return (
        <div
            className={clsx('rounded-xl', className)}
            style={{
                background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
            }}
        />
    );
}
