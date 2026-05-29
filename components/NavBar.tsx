import Link from "next/link";

export function NavBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-sky-100 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="text-lg font-bold tracking-tight text-ink">Polysmart Operations</div>
        <div className="flex items-center gap-5 text-sm font-medium text-slate-700">
          <Link href="/">Overview</Link>
          <Link href="/console">User Console</Link>
          <Link href="/admin">Admin Center</Link>
        </div>
      </nav>
    </header>
  );
}
