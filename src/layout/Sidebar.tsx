import type { Ref } from "react";
import { NavLink } from "react-router-dom";
import {
  BadgeCheck,
  ClipboardList,
  FolderTree,
  Landmark,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cx } from "@/lib/cx";

type Item = {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
};

const mainItems: Item[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, end: true },
  { label: "Borrowers", to: "/borrowers", icon: Users },
];

const loanItems: Item[] = [
  { label: "Loan Applications", to: "/loan-applications", icon: ClipboardList },
];

const productItems: Item[] = [
  { label: "Categories", to: "/product-categories", icon: FolderTree },
  { label: "Loan Products", to: "/products", icon: Landmark },
];

const referenceItems: Item[] = [{ label: "Grades", to: "/grades", icon: BadgeCheck }];

function NavItem({ item, onNavigate }: { item: Item; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) => cx("nav-link", isActive && "is-active")}
    >
      <Icon aria-hidden="true" size={18} strokeWidth={1.75} />
      <span className="nav-link__label">{item.label}</span>
      <span className="nav-link__tooltip" aria-hidden="true">
        {item.label}
      </span>
    </NavLink>
  );
}

export function Sidebar({
  collapsed,
  drawerOpen,
  sidebarRef,
  onNavigate,
  onToggleCollapsed,
  onClose,
  showCollapse,
  inaccessible = false,
}: {
  collapsed: boolean;
  drawerOpen: boolean;
  sidebarRef: Ref<HTMLElement>;
  onNavigate: () => void;
  onToggleCollapsed: () => void;
  onClose: () => void;
  showCollapse: boolean;
  inaccessible?: boolean;
}) {
  return (
    <aside
      id="app-sidebar"
      ref={sidebarRef}
      className={cx("sidebar", collapsed && "is-collapsed", drawerOpen && "is-drawer-open")}
      aria-label="Primary navigation"
      role={drawerOpen ? "dialog" : undefined}
      aria-modal={drawerOpen || undefined}
      aria-hidden={inaccessible || undefined}
      {...(inaccessible ? { inert: true } : {})}
    >
      <div className="sidebar__brand">
        <div className="brand-mark" aria-hidden="true">
          <span>LM</span>
        </div>
        <div className="brand__text">
          <strong>Loan Management</strong>
          <small>Operations</small>
        </div>
        <button type="button" className="nav-button sidebar__close icon-button" onClick={onClose}>
          <X aria-hidden="true" size={18} />
          <span className="visually-hidden">Close navigation</span>
        </button>
      </div>
      <nav className="sidebar__nav">
        {mainItems.map((item) => (
          <NavItem key={item.to} item={item} onNavigate={onNavigate} />
        ))}
        <div className="nav-section">
          {collapsed ? null : <p className="nav-section__label">Loan Management</p>}
          {loanItems.map((item) => (
            <NavItem key={item.to} item={item} onNavigate={onNavigate} />
          ))}
        </div>
        <div className="nav-section">
          {collapsed ? null : <p className="nav-section__label">Product Configuration</p>}
          <div className={cx("nav-sub", collapsed && "nav-sub--icons")}>
            {productItems.map((item) => (
              <NavItem key={item.to} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
        <div className="nav-section">
          {collapsed ? null : <p className="nav-section__label">Reference</p>}
          {referenceItems.map((item) => (
            <NavItem key={item.to} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      </nav>
      {showCollapse ? (
        <div className="sidebar__footer">
          <button
            type="button"
            className="nav-button"
            onClick={onToggleCollapsed}
            aria-pressed={collapsed}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" size={18} strokeWidth={1.75} />
            ) : (
              <PanelLeftClose aria-hidden="true" size={18} strokeWidth={1.75} />
            )}
            <span className="nav-link__label">
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            </span>
            <span className="nav-link__tooltip" aria-hidden="true">
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            </span>
          </button>
        </div>
      ) : null}
    </aside>
  );
}
