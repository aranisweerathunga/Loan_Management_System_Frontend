import type { KeyboardEvent, ReactNode } from "react";
import { cx } from "@/lib/cx";

export type TabItem = {
  id: string;
  label: string;
  panel: ReactNode;
};

export function Tabs({
  label,
  tabs,
  activeId,
  onChange,
}: {
  label: string;
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = Math.max(
      0,
      tabs.findIndex((tab) => tab.id === active.id),
    );
    const nextIndex =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : null;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = tabs[nextIndex];
    onChange(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  }

  return (
    <div className="tabs">
      <div role="tablist" aria-label={label} className="tabs__list" onKeyDown={onKeyDown}>
        {tabs.map((tab) => {
          const selected = tab.id === active.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              className={cx("tabs__tab", selected && "is-selected")}
              onClick={() => onChange(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`panel-${active.id}`}
        aria-labelledby={`tab-${active.id}`}
        className="tabs__panel"
        tabIndex={0}
      >
        {active.panel}
      </div>
    </div>
  );
}
