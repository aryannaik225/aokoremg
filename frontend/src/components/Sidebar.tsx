import {
  Fan,
  LayoutDashboard,
} from "lucide-react";
const NAV_ITEMS = [
  { label: "Overview", icon: LayoutDashboard, active: true }
];

export function Sidebar() {
  return (
    <aside
      className="hidden w-64 shrink-0 flex-col justify-between border-r px-4 py-6 transition-colors duration-300 lg:flex"
      style={{ backgroundColor: "var(--color-sidebar-bg)", borderColor: "var(--color-border)" }}
    >
      <div>
        <div className="flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Fan className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              Wind Forecast
            </div>
            <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              Accuracy Portal
            </div>
          </div>
        </div>

        <div className="mt-6 h-px" style={{ backgroundColor: "var(--color-border)" }} />

        <nav className="mt-6 flex flex-col gap-1">
          {NAV_ITEMS.map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              type="button"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-300"
              style={
                active
                  ? {
                      backgroundColor: "var(--color-sidebar-active)",
                      color: "var(--color-forecast)",
                    }
                  : { color: "var(--color-text-secondary)" }
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div
        className="rounded-2xl border p-4"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-sidebar-active)" }}
      >
        <div className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Clean Energy
        </div>
        <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Better Decisions
        </div>
        <div className="mt-2 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          Jan 2 – Feb 1, 2026
        </div>
      </div>
    </aside>
  );
}
