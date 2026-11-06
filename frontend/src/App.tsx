import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Button } from "@lifeos/ui/button";
import {
  AppShell,
  AuthProvider,
  InitialSetupPage,
  LoginPage,
  SettingsPage,
  useAuth,
} from "@/modules/Foundation";
import { FinancePage } from "@/modules/Finance/FinancePage";
import { DashboardPage } from "@/modules/Dashboard/DashboardPage";
import { WeeklyReviewPage } from "@/modules/Dashboard/WeeklyReviewPage";
import { FitnessPage } from "@/modules/Fitness/FitnessPage";
import { NutritionPage } from "@/modules/Nutrition/NutritionPage";
import { HealthPage } from "@/modules/Health/HealthPage";
import { WallDashboardPage } from "@/modules/Dashboard/WallDashboardPage";
import { PasskeyManagementPage } from "@/modules/Foundation/PasskeyManagementPage";

function ProtectedRoutes() {
  const { isLoading, owner, loadError, setupRequired } = useAuth();

  if (isLoading) {
    return (
      <main className="grid min-h-svh place-items-center">
        Loading your private workspace…
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="grid min-h-svh place-items-center bg-canvas px-6 text-center text-ink">
        <section className="max-w-md">
          <h1 className="text-title-l font-semibold">
            LifeOS is temporarily unavailable
          </h1>
          <p className="mt-3 text-body-s text-ink-muted">
            Check your connection and reload this page.
          </p>
          <button
            className="mt-6 rounded-sm bg-primary px-4 py-2 font-semibold text-on-primary"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </section>
      </main>
    );
  }

  if (!owner) {
    return <Navigate to={setupRequired ? "/setup" : "/login"} replace />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="finance" element={<FinancePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="review" element={<WeeklyReviewPage />} />
        <Route path="fitness" element={<FitnessPage />} />
        <Route path="nutrition" element={<NutritionPage />} />
        <Route path="health" element={<HealthPage />} />
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}

function AppRoutes() {
  const { isLoading, loadError, owner, setupRequired } = useAuth();

  return (
    <Routes>
      <Route path="/passkeys/manage" element={<PasskeyManagementPage />} />
      <Route
        path="/setup"
        element={
          isLoading ? (
            <main className="grid min-h-svh place-items-center">
              Loading LifeOS…
            </main>
          ) : loadError ? (
            <AuthUnavailable />
          ) : setupRequired && !owner ? (
            <InitialSetupPage />
          ) : (
            <Navigate to={owner ? "/dashboard" : "/login"} replace />
          )
        }
      />
      <Route
        path="/login"
        element={
          isLoading ? (
            <main className="grid min-h-svh place-items-center">
              Loading LifeOS…
            </main>
          ) : loadError ? (
            <AuthUnavailable />
          ) : owner ? (
            <Navigate to="/dashboard" replace />
          ) : setupRequired ? (
            <Navigate to="/setup" replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route path="/wall" element={<WallDashboardRoute />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
}

function AuthUnavailable() {
  return (
    <main className="grid min-h-svh place-items-center bg-canvas px-6 text-center text-ink">
      <section className="max-w-md">
        <h1 className="font-display text-display-m text-ink">
          LifeOS is temporarily unavailable
        </h1>
        <p className="mt-3 text-body text-ink-muted">
          Check your connection and reload this page.
        </p>
        <Button className="mt-6" onPress={() => window.location.reload()}>
          Reload
        </Button>
      </section>
    </main>
  );
}

function WallDashboardRoute() {
  const { isLoading, loadError, owner, setupRequired } = useAuth();

  if (isLoading) {
    return (
      <main className="grid min-h-svh place-items-center">Loading LifeOS…</main>
    );
  }

  if (loadError) {
    return (
      <main className="grid min-h-svh place-items-center">
        LifeOS is temporarily unavailable.
      </main>
    );
  }

  return owner ? (
    <WallDashboardPage />
  ) : (
    <Navigate to={setupRequired ? "/setup" : "/login"} replace />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
