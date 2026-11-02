import { Navigate, Outlet, useSearchParams } from "react-router-dom";
import { FullPageError } from "../../components/FullPageError";
import { FullPageLoader } from "../../components/FullPageLoader";
import { safeRedirect } from "../../lib/redirect";
import { useAuth } from "./useAuth";

/** AUTH-5: signed-in users never see /login or /register. Also completes the login redirect (AUTH-2). */
export function GuestRoute() {
  const { status, retry } = useAuth();
  const [params] = useSearchParams();

  if (status === "loading") return <FullPageLoader />;
  if (status === "error") {
    return <FullPageError message="Cannot reach the server. Is it running?" onRetry={retry} />;
  }
  if (status === "authenticated") {
    return <Navigate to={safeRedirect(params.get("redirect"))} replace />;
  }
  return <Outlet />;
}