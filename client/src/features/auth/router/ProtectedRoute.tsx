import { Navigate, Outlet, useLocation } from "react-router-dom";
import { FullPageError } from "../../../components/FullPageError";
import { FullPageLoader } from "../../../components/FullPageLoader";
import { useAuth } from "../hooks/useAuth";

/** AUTH-5: signed-out users are sent to /login?redirect=<the page they asked for>. */
export function ProtectedRoute() {
  const { status, signOutReason, retry } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullPageLoader />;
  if (status === "error") {
    return <FullPageError message="Cannot reach the server. Is it running?" onRetry={retry} />;
  }
  if (status === "unauthenticated") {
    // After an intentional logout there is no page worth coming back to.
    const target =
      signOutReason === "manual"
        ? "/login"
        : `/login?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`;
    return <Navigate to={target} replace />;
  }
  return <Outlet />;
}
