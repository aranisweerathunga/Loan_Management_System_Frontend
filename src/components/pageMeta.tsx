import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Crumb } from "@/components/Breadcrumbs";

type PageMeta = {
  snapshot: string;
  title: string;
  breadcrumbs: Crumb[];
};

type PageMetaContextValue = {
  meta: PageMeta;
  setMeta: (meta: PageMeta) => void;
};

const PageMetaContext = createContext<PageMetaContextValue | null>(null);

const initialMeta: PageMeta = {
  snapshot: "",
  title: "Loan Management",
  breadcrumbs: [{ label: "Dashboard" }],
};

export function PageMetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<PageMeta>(initialMeta);
  const value = useMemo(() => ({ meta, setMeta }), [meta]);
  return <PageMetaContext.Provider value={value}>{children}</PageMetaContext.Provider>;
}

export function usePageMetaState() {
  const value = useContext(PageMetaContext);
  if (!value) throw new Error("Page metadata is unavailable outside the application shell.");
  return value;
}

export function usePageMeta(title: string, breadcrumbs: Crumb[]) {
  const { meta, setMeta } = usePageMetaState();
  const snapshot = `${title}|${breadcrumbs
    .map((crumb) => `${crumb.label}:${crumb.to ?? ""}`)
    .join(">")}`;

  useLayoutEffect(() => {
    if (meta.snapshot !== snapshot) setMeta({ snapshot, title, breadcrumbs });
  }, [breadcrumbs, meta.snapshot, setMeta, snapshot, title]);

  useEffect(() => {
    document.title = `${title} · Loan Management`;
  }, [title]);
}
