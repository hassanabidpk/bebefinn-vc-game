"use client";

import type { ReactNode } from "react";

interface IpadShellProps {
  children: ReactNode;
}

/** Outer iPad-landscape bezel with a rounded screen surface. */
export function IpadShell({ children }: IpadShellProps) {
  return (
    <div className="page">
      <div className="ipad-scaler">
        <div className="ipad">
          <div className="ipad-screen">{children}</div>
        </div>
      </div>
    </div>
  );
}
