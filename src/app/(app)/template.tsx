import { ViewTransition } from "react";

/**
 * Templates remount on every navigation, so each page enters/exits through
 * this ViewTransition: the old page fades out while the new one fades in.
 * `default="none"` keeps in-place updates (refreshes, filters) instant.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
