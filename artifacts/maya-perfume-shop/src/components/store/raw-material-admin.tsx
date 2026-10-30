import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListAdminRawMaterialsQueryKey, getListRawMaterialsQueryKey, useAddHillenRawMaterial, useDeleteRawMaterial,
  useImportHillenMaterials, useListAdminRawMaterials, useResearchRawMaterials, useUpdateRawMaterial,
} from "@workspace/api-client-react";
import type { RawMaterial, RawMaterialCandidate, RawMaterialResearch } from "@workspace/api-client-react";
import { AlertTriangle, CloudDownload, ExternalLink, FlaskConical, Loader2, Pencil, Plus, RefreshCw, Search, Sparkles, Trash2, X } from "lucide-react";
import { formatMoney, type Currency } from "@/lib/money";

const errText = (e: unknown) => e instanceof Error ? e.message : "Something went wrong. Please try again.";
type Progress = { page: number; totalPages: number; total: number; created: number; skipped: number; processed: number; issues: string[]; status: "running" | "done" | "failed"; error?: string };
type Edit = { name: string; description: string; category: string; price: string; currency: Currency; published: boolean };

const input = "h-10 w-full rounded-md border border-white/[.09] bg-[#00262a] px-3 text-xs text-[#e2e0d8] outline-none placeholder:text-[#606b66] focus:border-[#b9a274]/60";
const card = "rounded-lg border border-white/[.08] bg-[#023f44]/90";

export function RawMaterialAdmin({ notify }: { notify: (tone: "success" | "error", text: string) => void }) {
  const qc = useQueryClient();
  const list = useListAdminRawMaterials();
  const importPage = useImportHillenMaterials();
  const research = useResearchRawMaterials();
  const addOne = useAddHillenRawMaterial();
  const update = useUpdateRawMaterial();
  const remove = useDeleteRawMaterial();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<RawMaterialResearch | null>(null);
  const [adding, setAdding] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [editing, setEditing] = useState<RawMaterial | null>(null);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [deleting, setDeleting] = useState<RawMaterial | null>(null);
  const materials = list.data ?? [];
  const importing = progress?.status === "running";
  const busy = importing || addOne.isPending;
  const savedIds = useMemo(() => new Set(materials.map((m) => m.source_id)), [materials]);
  const cats = useMemo(() => [...new Set(materials.map((m) => m.category).filter(Boolean))].sort(), [materials]);
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return materials.filter((m) => (cat === "All" || m.category === cat) && (!s || `${m.name} ${m.category} ${m.source_id}`.toLowerCase().includes(s)));
  }, [materials, search, cat]);
  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: getListAdminRawMaterialsQueryKey() }),
    qc.invalidateQueries({ queryKey: getListRawMaterialsQueryKey() }),
  ]);

  const runImport = async () => {
    if (busy) return;
    if (!window.confirm("Import every public Hillen99 material?\n\nNew materials are published immediately on the public Raw Materials page at the original supplier price per gram (no markup). Existing materials and your edits are kept. Please review image rights and supplier prices afterwards.")) return;
    let p: Progress = { page: 0, totalPages: 0, total: 0, created: 0, skipped: 0, processed: 0, issues: [], status: "running" };
    setProgress(p);
    for (let page = 1; page <= 1000; page++) {
      try {
        const r = await importPage.mutateAsync({ data: { page } });
        p = { ...p, page: r.page, totalPages: r.total_pages, total: r.total, created: p.created + r.created, skipped: p.skipped + r.skipped, processed: p.processed + r.processed, issues: [...p.issues, ...r.issues] };
        setProgress(p);
        await refresh();
        if (r.complete || page >= r.total_pages) break;
      } catch (e) {
        p = { ...p, status: "failed", error: `Page ${page} failed: ${errText(e)}` };
        setProgress(p); await refresh();
        notify("error", `Import stopped on page ${page}. ${p.created} new materials were saved before the error.`);
        return;
      }
    }
    setProgress({ ...p, status: "done" });
    notify("success", `Import complete. ${p.created} added, ${p.skipped} already saved or skipped.`);
  };

  const runResearch = async () => {
    if (query.trim().length < 2) { notify("error", "Enter at least two characters."); return; }
    try { setResult(await research.mutateAsync({ data: { query: query.trim() } })); } catch (e) { notify("error", errText(e)); }
  };
  const importOne = async (c: RawMaterialCandidate) => {
    if (busy) return;
    setAdding(c.source_id);
    try { await addOne.mutateAsync({ data: { source_id: c.source_id } }); await refresh(); notify("success", `${c.name} added and published.`); }
    catch (e) { notify("error", errText(e)); } finally { setAdding(null); }
  };
  const openEdit = (m: RawMaterial) => { setEditing(m); setEdit({ name: m.name, description: m.description, category: m.category, price: String(m.price), currency: m.currency, published: m.published }); };
  const saveEdit = async () => {
    if (!editing || !edit) return;
    const price = Number(edit.price);
    if (!edit.name.trim() || !edit.category.trim()) { notify("error", "Name and category are required."); return; }
    if (!Number.isFinite(price) || price < 0) { notify("error", "Enter a valid price per gram."); return; }
    try {
      await update.mutateAsync({ id: editing.id, data: { name: edit.name.trim(), description: edit.description, category: edit.category.trim(), price, currency: edit.currency, published: edit.published } });
      await refresh(); setEditing(null); notify("success", "Material saved.");
    } catch (e) { notify("error", errText(e)); }
  };
  const togglePublish = async (m: RawMaterial) => {
    try { await update.mutateAsync({ id: m.id, data: { published: !m.published } }); await refresh(); }
    catch (e) { notify("error", errText(e)); }
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    try { await remove.mutateAsync({ id: deleting.id }); await refresh(); notify("success", `${deleting.name} removed.`); setDeleting(null); }
    catch (e) { notify("error", errText(e)); }
  };

  const pct = progress && progress.total ? Math.min(100, Math.round((progress.processed / progress.total) * 100)) : 0;

  return <section className="animate-[fadeIn_.4s_ease-out] space-y-6" data-testid="section-raw-materials-admin">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div><p className="text-[9px] font-semibold uppercase tracking-[.22em] text-[#a9956d]">RAW MATERIALS · {String(materials.length).padStart(2, "0")} SAVED</p><h1 className="mt-2 font-serif text-[34px] leading-tight text-[#eee9df] md:text-[42px]">Material library</h1><p className="mt-2 max-w-lg text-[12px] leading-5 text-[#8c9691]">Supplier materials from Hillen99, priced per gram. Shown on the public Raw Materials page, separate from perfumes and the bag.</p></div>
      <button onClick={() => void runImport()} disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#D9AD45] px-5 text-[10px] font-semibold uppercase tracking-[.13em] text-[#1b201f] hover:bg-[#F0D49A] disabled:opacity-50" data-testid="button-import-all-hillen">{importing ? <Loader2 size={15} className="animate-spin"/> : <CloudDownload size={15}/>}{importing ? "Importing" : "Import all from Hillen99"}</button>
    </div>
    <p className="rounded-md border border-[#c7b182]/15 bg-[#c7b182]/[.05] px-4 py-3 text-[11px] leading-5 text-[#b9b29c]">Imports use original Hillen99 prices per gram with no markup and publish directly. Supplier availability reflects Hillen99 only, not Maya stock. Review image rights and prices before relying on them. Re-running the import is safe: saved materials and your edits are never overwritten.</p>

    {progress && <div className={`${card} p-4`} data-testid="status-import-progress" aria-live="polite">
      <div className="flex items-center justify-between text-[11px] text-[#c9c6bb]"><span>{progress.status === "running" ? `Importing page ${progress.page + 1}${progress.totalPages ? ` of ${progress.totalPages}` : ""}` : progress.status === "done" ? "Import complete" : "Import stopped"}</span><span className="font-mono">{progress.processed}{progress.total ? ` / ${progress.total}` : ""}</span></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded bg-white/[.06]"><div className={`h-full origin-left transition-transform duration-500 ${progress.status === "failed" ? "bg-[#c7796a]" : "bg-[#D9AD45]"}`} style={{ transform: `scaleX(${progress.status === "done" ? 1 : pct / 100})` }}/></div>
      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-[#9fb3b0]"><span data-testid="text-import-created">Added {progress.created}</span><span data-testid="text-import-skipped">Already saved or skipped {progress.skipped}</span><span data-testid="text-import-issues">Issues {progress.issues.length}</span></div>
      {progress.error && <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[#f0c2b6]" role="alert"><AlertTriangle size={14}/>{progress.error}. Saved progress is kept.<button onClick={() => void runImport()} className="inline-flex items-center gap-1 rounded border border-white/15 px-2 py-1 text-[#F0D49A]" data-testid="button-import-retry"><RefreshCw size={12}/> Retry from page 1</button></div>}
      {progress.issues.length > 0 && <details className="mt-3 text-[11px] text-[#c9b9a0]"><summary className="cursor-pointer">Show issues</summary><ul className="mt-2 max-h-40 list-disc space-y-1 overflow-auto pl-5">{progress.issues.map((s, i) => <li key={i}>{s}</li>)}</ul></details>}
    </div>}

    <div className={`${card} p-4 md:p-5`}>
      <div className="flex items-center gap-2 text-[#d5c69f]"><Sparkles size={15}/><h2 className="font-serif text-[20px]">AI material search</h2></div>
      <p className="mt-1 text-[11px] text-[#78827d]">Find matching Hillen99 materials and add them one by one.</p>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void runResearch(); }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. oud oil, iso e super, musk" className={input} maxLength={120} data-testid="input-raw-research"/>
        <button disabled={research.isPending} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-[#b49e70]/30 px-4 text-[10px] uppercase tracking-[.1em] text-[#d5c69f] disabled:opacity-50" data-testid="button-raw-research">{research.isPending ? <Loader2 size={14} className="animate-spin"/> : <Search size={14}/>}Search</button>
      </form>
      {result && <div className="mt-4 space-y-3" data-testid="state-raw-research-result">
        {result.warning && <p className="flex gap-2 text-[11px] text-[#e5c48f]"><AlertTriangle size={14} className="shrink-0"/>{result.warning}</p>}
        {result.answer && <p className="whitespace-pre-line text-[12px] leading-5 text-[#c9cbc3]">{result.answer}</p>}
        {result.matches.length === 0 ? <p className="text-[12px] text-[#828d87]" data-testid="state-raw-research-empty">No matching Hillen99 materials found.</p>
          : <ul className="grid gap-2 md:grid-cols-2">{result.matches.map((c) => { const saved = savedIds.has(c.source_id); return <li key={c.source_id} className="flex gap-3 rounded-lg border border-white/[.07] bg-[#00262a]/70 p-3" data-testid={`card-raw-candidate-${c.source_id}`}>
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded bg-[#03444a] text-[#D9AD45]">{c.image_url ? <img src={c.image_url} alt={c.name} className="h-full w-full object-cover"/> : <FlaskConical size={16}/>}</div>
            <div className="min-w-0 flex-1"><p className="truncate font-serif text-[16px] text-[#F0D49A]">{c.name}</p><p className="text-[10px] text-[#9fb3b0]">{c.category} · <span className="font-mono">{formatMoney(c.price, c.currency)}/g</span> · Hillen99 {c.supplier_available ? "lists available" : "lists unavailable"}</p>{c.source_url && <a href={c.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#a99770]">Source <ExternalLink size={10}/></a>}</div>
            <button onClick={() => void importOne(c)} disabled={saved || busy} className="h-9 shrink-0 self-center rounded-md border border-white/10 px-3 text-[10px] text-[#F0D49A] disabled:opacity-40" data-testid={`button-add-candidate-${c.source_id}`}>{adding === c.source_id ? <Loader2 size={13} className="animate-spin"/> : saved ? "Saved" : <span className="inline-flex items-center gap-1"><Plus size={12}/>Add</span>}</button>
          </li>; })}</ul>}
      </div>}
    </div>

    <div className={card}>
      <div className="grid gap-2 border-b border-white/[.07] p-4 sm:grid-cols-[1fr_200px]">
        <label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737e79]"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search saved materials" className={`${input} pl-9`} data-testid="input-raw-admin-search"/></label>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={input} aria-label="Filter category" data-testid="select-raw-admin-category"><option>All</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      {list.isLoading ? <div className="space-y-2 p-4">{[1, 2, 3].map((n) => <div key={n} className="h-16 animate-pulse rounded bg-[#03444a]"/>)}</div>
        : list.isError ? <div className="p-8 text-center" role="alert" data-testid="state-raw-admin-error"><p className="text-sm text-[#f0c2b6]">{errText(list.error)}</p><button onClick={() => void list.refetch()} className="mt-3 text-[10px] uppercase tracking-wider text-[#d0bb8c]" data-testid="button-raw-admin-retry">Try again</button></div>
        : materials.length === 0 ? <div className="p-10 text-center" data-testid="state-raw-admin-empty"><FlaskConical className="mx-auto text-[#b9a274]" size={20}/><p className="mt-3 font-serif text-lg text-[#e8e4d9]">No materials saved yet</p><p className="mt-1 text-xs text-[#818c87]">Run the Hillen99 import or add materials from the AI search.</p></div>
        : filtered.length === 0 ? <div className="p-10 text-center" data-testid="state-raw-admin-no-results"><p className="font-serif text-lg text-[#dedbd1]">No matching materials</p><button onClick={() => { setSearch(""); setCat("All"); }} className="mt-3 text-[10px] uppercase tracking-wider text-[#d0bb8c]">Clear filters</button></div>
        : <ul className="divide-y divide-white/[.06]">{filtered.map((m) => <li key={m.id} className="flex gap-3 p-3 md:p-4" data-testid={`row-raw-material-${m.id}`}>
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded bg-[#03444a] text-[#D9AD45]">{m.image_url ? <img src={m.image_url} alt={m.name} className="h-full w-full object-cover"/> : <FlaskConical size={16}/>}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-[16px] text-[#F0D49A]">{m.name}</p>
            <p className="mt-0.5 text-[10px] text-[#9fb3b0]">{m.category} · Hillen99 #{m.source_id}</p>
            <p className="mt-1 flex flex-wrap gap-x-3 text-[11px]"><span className="font-mono text-[#e2ddcf]">{formatMoney(m.price, m.currency)}/g</span><span className="text-[#77817c]">Source {formatMoney(m.source_price, m.source_currency)}/g</span><span className={m.published ? "text-[#9fd1c4]" : "text-[#c9a98f]"}>{m.published ? "Published" : "Hidden"}</span></p>
          </div>
          <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center">
            <button onClick={() => void togglePublish(m)} disabled={update.isPending} className="h-9 rounded-md border border-white/10 px-2 text-[10px] text-[#c6cbc5] disabled:opacity-50" data-testid={`button-toggle-raw-${m.id}`}>{m.published ? "Hide" : "Publish"}</button>
            <div className="flex gap-1"><button onClick={() => openEdit(m)} aria-label={`Edit ${m.name}`} className="grid h-9 w-9 place-items-center rounded-md border border-white/10 text-[#F0D49A]" data-testid={`button-edit-raw-${m.id}`}><Pencil size={14}/></button>
            <button onClick={() => setDeleting(m)} aria-label={`Delete ${m.name}`} className="grid h-9 w-9 place-items-center rounded-md border border-[#c7796a]/25 text-[#e09a8b]" data-testid={`button-delete-raw-${m.id}`}><Trash2 size={14}/></button></div>
          </div>
        </li>)}</ul>}
    </div>

    {editing && edit && <div className="fixed inset-0 z-[60] grid place-items-end bg-black/70 sm:place-items-center sm:p-4"><section role="dialog" aria-modal="true" className="max-h-[92dvh] w-full max-w-[520px] overflow-auto rounded-t-xl border border-white/10 bg-[#033f44] p-5 sm:rounded-xl">
      <div className="flex items-center justify-between"><h2 className="font-serif text-2xl text-[#eee9df]">Edit material</h2><button onClick={() => setEditing(null)} aria-label="Close" className="p-2 text-[#9ba29e]" data-testid="button-close-raw-edit"><X size={18}/></button></div>
      <div className="mt-4 grid gap-3 text-[10px] uppercase tracking-[.12em] text-[#8c9691]">
        <label>Name<input className={`${input} mt-1`} value={edit.name} maxLength={500} onChange={(e) => setEdit({ ...edit, name: e.target.value })} data-testid="input-raw-edit-name"/></label>
        <label>Category<input className={`${input} mt-1`} value={edit.category} maxLength={150} onChange={(e) => setEdit({ ...edit, category: e.target.value })} data-testid="input-raw-edit-category"/></label>
        <div className="grid grid-cols-[1fr_110px] gap-2"><label>Price per gram<input type="number" min={0} step="any" className={`${input} mt-1`} value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} data-testid="input-raw-edit-price"/></label>
        <label>Currency<select className={`${input} mt-1`} value={edit.currency} onChange={(e) => setEdit({ ...edit, currency: e.target.value as Currency })} data-testid="select-raw-edit-currency"><option value="USD">USD</option><option value="IQD">IQD</option></select></label></div>
        <p className="normal-case tracking-normal text-[#77817c]">Hillen99 source price: {formatMoney(editing.source_price, editing.source_currency)} per gram (read-only). Changing currency does not convert the amount.</p>
        <label>Description<textarea className={`${input} mt-1 h-28 py-2`} value={edit.description} maxLength={3000} onChange={(e) => setEdit({ ...edit, description: e.target.value })} data-testid="input-raw-edit-description"/></label>
        <label className="flex items-center gap-2 normal-case tracking-normal text-[#c6cbc5]"><input type="checkbox" checked={edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} data-testid="checkbox-raw-edit-published"/>Published on the public Raw Materials page</label>
      </div>
      <div className="mt-5 flex justify-end gap-2"><button onClick={() => setEditing(null)} className="rounded-md border border-white/10 px-4 py-2.5 text-xs text-[#c6cbc5]">Cancel</button><button onClick={() => void saveEdit()} disabled={update.isPending} className="inline-flex items-center gap-2 rounded-md bg-[#D9AD45] px-4 py-2.5 text-xs font-semibold text-[#1b201f] disabled:opacity-50" data-testid="button-save-raw-edit">{update.isPending && <Loader2 size={13} className="animate-spin"/>}Save</button></div>
    </section></div>}

    {deleting && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4"><section role="alertdialog" aria-modal="true" className="w-full max-w-[420px] rounded-xl border border-white/10 bg-[#033f44] p-6">
      <h2 className="font-serif text-2xl text-[#eee9df]">Remove this material?</h2><p className="mt-2 text-sm leading-6 text-[#9ba39e]"><span className="text-[#e5dfd1]">{deleting.name}</span> will be removed from the library and the public page.</p>
      <div className="mt-6 flex justify-end gap-3"><button onClick={() => setDeleting(null)} className="rounded-md border border-white/10 px-4 py-2.5 text-xs text-[#c6cbc5]" data-testid="button-cancel-raw-delete">Keep</button><button onClick={() => void confirmDelete()} disabled={remove.isPending} className="inline-flex items-center gap-2 rounded-md bg-[#a9574d] px-4 py-2.5 text-xs text-white disabled:opacity-50" data-testid="button-confirm-raw-delete">{remove.isPending && <Loader2 size={13} className="animate-spin"/>}Remove</button></div>
    </section></div>}
  </section>;
}
