import { CloudOff, FileCheck2 } from 'lucide-react'

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0e1925] p-5 text-slate-950">
      <section className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800"><CloudOff className="h-6 w-6" /></div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Field mode</p>
        <h1 className="mt-1 text-2xl font-bold">You are offline</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Open work already loaded in the app can still be saved on this device. Reconnect before final submission or downloading new platform data.</p>
        <div className="mt-5 flex gap-3 rounded-2xl bg-slate-50 p-4"><FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><p className="text-sm leading-6 text-slate-700"><strong>Device drafts are retained.</strong> Return to the previous screen when connectivity is restored to synchronise them.</p></div>
      </section>
    </main>
  )
}
