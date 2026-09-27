import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { PageMetaProvider } from "@/components/pageMeta";
import { focusPreferred, useFocusTrap } from "@/lib/focusTrap";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { Header } from "@/layout/Header";
import { Sidebar } from "@/layout/Sidebar";

const COLLAPSE_KEY = "lms.sidebar.collapsed";

export function AppShell() {
  const isDesktop = useMediaQuery("(min-width: 1100px)");
  const location = useLocation();
  const [collapsedPref, setCollapsedPref] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [trackedPath, setTrackedPath] = useState(location.pathname);
  const [desktopMode, setDesktopMode] = useState(isDesktop);
  if (location.pathname !== trackedPath) {
    setTrackedPath(location.pathname);
    setMobileOpen(false);
  }
  if (isDesktop !== desktopMode) {
    setDesktopMode(isDesktop);
    if (isDesktop) setMobileOpen(false);
  }
  const sidebarRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const collapsed = isDesktop && collapsedPref;

  function closeDrawer() {
    setMobileOpen(false);
  }

  useFocusTrap(mobileOpen, sidebarRef, closeDrawer);

  useEffect(() => {
    if (mobileOpen) {
      wasOpen.current = true;
      focusPreferred(sidebarRef.current);
      return;
    }
    if (wasOpen.current) menuRef.current?.focus();
  }, [mobileOpen]);

  function toggleCollapsed() {
    setCollapsedPref((current) => {
      const next = !current;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // Preference storage is optional.
      }
      return next;
    });
  }

  return (
    <PageMetaProvider>
      <div className={collapsed ? "app-shell is-collapsed" : "app-shell"}>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {mobileOpen ? (
          <button
            type="button"
            className="nav-overlay"
            aria-label="Close navigation"
            onClick={closeDrawer}
          />
        ) : null}
        <Sidebar
          collapsed={collapsed}
          drawerOpen={!isDesktop && mobileOpen}
          sidebarRef={sidebarRef}
          showCollapse={isDesktop}
          inaccessible={!isDesktop && !mobileOpen}
          onNavigate={closeDrawer}
          onToggleCollapsed={toggleCollapsed}
          onClose={closeDrawer}
        />
        <div className="app-shell__content">
          <Header
            menuRef={menuRef}
            mobileOpen={mobileOpen}
            onOpenMenu={() => setMobileOpen(true)}
          />
          <main id="main-content" className="app-main" tabIndex={-1}>
            <Outlet />
          </main>
        </div>
      </div>
    </PageMetaProvider>
  );
}
