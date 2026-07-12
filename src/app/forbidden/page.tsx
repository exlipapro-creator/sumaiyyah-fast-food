import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div data-testid="forbidden" className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Access Denied</h1>
        <p className="text-slate-400 mb-6">You don&apos;t have permission to view this page.</p>
        <Link
          href="/"
          className="bg-amber-500 text-slate-950 font-semibold rounded-lg px-5 py-2.5 hover:bg-amber-400 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
