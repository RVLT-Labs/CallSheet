import type { ReactNode } from "react";

/** The default list item: flat, hairline-divided, no card chrome (design system §5.5/§1). */
export function ListRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-hairline py-3 text-[13.5px] last:border-b-0">
      {children}
    </div>
  );
}
