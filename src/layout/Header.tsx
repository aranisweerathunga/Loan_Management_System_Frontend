import { useEffect, useId, useRef, useState, type Ref } from "react";
import { Bell, CircleUser, Menu } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { usePageMetaState } from "@/components/pageMeta";

export function Header({
  menuRef,
  mobileOpen,
  onOpenMenu,
}: {
  menuRef: Ref<HTMLButtonElement>;
  mobileOpen: boolean;
  onOpenMenu: () => void;
}) {
  const { meta } = usePageMetaState();
  const [panel, setPanel] = useState<"notifications" | "account" | null>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const notificationsId = useId();
  const accountId = useId();

  useEffect(() => {
    if (!panel) return;
    function onPointer(event: MouseEvent) {
      if (!toolsRef.current?.contains(event.target as Node)) setPanel(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel(null);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [panel]);

  return (
    <header className="app-header">
      <button
        ref={menuRef}
        type="button"
        className="button button--secondary icon-button header-menu"
        aria-label="Open navigation"
        aria-controls="app-sidebar"
        aria-expanded={mobileOpen}
        onClick={onOpenMenu}
      >
        <Menu aria-hidden="true" size={18} />
      </button>
      <Breadcrumbs items={meta.breadcrumbs} />
      <div className="header-tools" ref={toolsRef}>
        <div className="header-disclosure">
          <button
            type="button"
            className="header-tool icon-button"
            aria-expanded={panel === "notifications"}
            aria-controls={notificationsId}
            onClick={() =>
              setPanel((current) => (current === "notifications" ? null : "notifications"))
            }
          >
            <Bell aria-hidden="true" size={18} />
            <span className="visually-hidden">Notifications</span>
          </button>
          {panel === "notifications" ? (
            <div
              className="header-panel"
              id={notificationsId}
              role="region"
              aria-label="Notifications"
            >
              <h2>Notifications</h2>
              <p>
                No notification service is connected. This area is reserved for later operational
                alerts.
              </p>
            </div>
          ) : null}
        </div>
        <div className="header-disclosure">
          <button
            type="button"
            className="header-tool"
            aria-expanded={panel === "account"}
            aria-controls={accountId}
            onClick={() => setPanel((current) => (current === "account" ? null : "account"))}
          >
            <CircleUser aria-hidden="true" size={18} />
            <span className="header-tool__text">
              <strong>Account</strong>
              <small>Not signed in</small>
            </span>
          </button>
          {panel === "account" ? (
            <div className="header-panel" id={accountId} role="region" aria-label="Account">
              <h2>Account</h2>
              <p>
                Sign-in is not configured. Authentication and access control will be added in a
                later phase. This workspace does not store a user session.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
