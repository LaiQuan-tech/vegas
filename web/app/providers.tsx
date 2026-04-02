"use client";

import { type ReactNode } from "react";
import dynamic from "next/dynamic";

const ProvidersInner = dynamic(
  () => import("./providers-inner").then((mod) => mod.ProvidersInner),
  { ssr: false }
);

export function Providers({ children }: { children: ReactNode }) {
  return <ProvidersInner>{children}</ProvidersInner>;
}
