function App() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-stone-950 px-6 py-12 text-stone-100">
      <section className="flex w-full max-w-3xl flex-col gap-10 rounded-3xl border border-white/10 bg-stone-900/70 p-8 shadow-2xl shadow-emerald-950/20 sm:p-12">
        <div className="flex items-center gap-3 text-sm font-medium text-emerald-300">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_theme(colors.emerald.400)]"
          />
          Foundation ready
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-400">
            Personal operating system
          </p>
          <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-7xl">
            LifeOS
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-stone-300">
            A private home for daily planning, finance, fitness, nutrition, and
            the signals that help shape a better week.
          </p>
        </div>

        <div className="grid gap-3 border-t border-white/10 pt-6 text-sm text-stone-400 sm:grid-cols-3">
          <span>Laravel API</span>
          <span>React PWA</span>
          <span>PostgreSQL</span>
        </div>
      </section>
    </main>
  );
}

export default App;
