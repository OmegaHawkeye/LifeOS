import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import {
  AppShell,
  AuthProvider,
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

const modules = [
  {
    path: "dashboard",
    label: "Dashboard",
    description: "Your day, at a glance.",
  },
  {
    path: "fitness",
    label: "Fitness",
    description: "Training and progress, together.",
  },
  {
    path: "nutrition",
    label: "Nutrition",
    description: "Make a practical plan for the week.",
  },
  {
    path: "health",
    label: "Health",
    description: "Health signals you choose to track.",
  },
];

function ProtectedRoutes() {
  const { isLoading, owner, loadError } = useAuth();

  if (isLoading) {
    return (
      <main className="grid min-h-svh place-items-center">
        Loading your private workspace…
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="grid min-h-svh place-items-center px-6 text-center">
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
    return <Navigate to="/login" replace />;
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
        {modules
          .filter(
            (module) => module.path !== "dashboard" && module.path !== "health",
          )
          .map((module) => (
            <Route
              key={module.path}
              path={module.path}
              element={
                <ModulePage
                  title={module.label}
                  description={module.description}
                />
              }
            />
          ))}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}

function ModulePage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { owner } = useAuth();

  return (
    <section aria-labelledby="page-title" className="mx-auto w-full max-w-5xl">
      <p className="m-0 text-overline uppercase text-ink-muted">
        Your private workspace
      </p>
      <h1
        id="page-title"
        className="m-0 mt-2 text-balance font-display text-display-m text-ink tablet:text-display-l"
      >
        {title}
      </h1>
      <p className="mt-3 text-body-s text-ink-muted">{description}</p>
      {title === "Dashboard" && (
        <div className="mt-10 rounded-md border border-line bg-surface p-6 shadow-raised sm:p-8">
          <p className="text-body-s text-ink-muted">Welcome back</p>
          <p className="mt-2 text-title-l font-medium">{owner?.name}</p>
          <p className="mt-5 max-w-xl text-body text-ink-muted">
            Your LifeOS workspace is ready. Choose a module to start capturing
            and planning your week.
          </p>
        </div>
      )}
    </section>
  );
}

function AppRoutes() {
  const { owner } = useAuth();

  return (
    <Routes>
      <Route path="/passkeys/manage" element={<PasskeyManagementPage />} />
      <Route
        path="/login"
        element={owner ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route path="/wall" element={<WallDashboardRoute />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
}

function WallDashboardRoute() {
  const { isLoading, loadError, owner } = useAuth();

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

  return owner ? <WallDashboardPage /> : <Navigate to="/login" replace />;
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
