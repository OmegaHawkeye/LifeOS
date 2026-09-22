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
          <h1 className="text-xl font-semibold">
            LifeOS is temporarily unavailable
          </h1>
          <p className="mt-3 text-sm text-stone-400">
            Check your connection and reload this page.
          </p>
          <button
            className="mt-6 rounded-xl bg-emerald-400 px-4 py-2 font-semibold text-stone-950"
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
      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
        Your private workspace
      </p>
      <h1
        id="page-title"
        className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
      >
        {title}
      </h1>
      <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
        {description}
      </p>
      {title === "Dashboard" && (
        <div className="mt-10 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-stone-900 sm:p-8">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Welcome back
          </p>
          <p className="mt-2 text-xl font-medium">{owner?.name}</p>
          <p className="mt-5 max-w-xl text-sm leading-6 text-stone-500 dark:text-stone-400">
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
