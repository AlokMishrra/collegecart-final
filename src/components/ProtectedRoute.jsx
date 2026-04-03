import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

/**
 * ProtectedRoute — enforces role-based access.
 * requiredRole: "admin" | "any" (authenticated)
 * If the user doesn't have the required role, they are redirected to /Shop.
 */
export default function ProtectedRoute({ children, requiredRole = "admin" }) {
  const [status, setStatus] = useState("loading"); // "loading" | "allowed" | "denied"

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        if (!user) { setStatus("denied"); return; }
        if (requiredRole === "any") { setStatus("allowed"); return; }
        if (requiredRole === "admin" && user.role === "admin") { setStatus("allowed"); return; }
        setStatus("denied");
      } catch {
        setStatus("denied");
      }
    })();
  }, [requiredRole]);

  if (status === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (status === "denied") return <Navigate to="/Shop" replace />;
  return children;
}