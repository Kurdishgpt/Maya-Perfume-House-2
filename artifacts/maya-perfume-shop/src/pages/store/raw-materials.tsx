import { useMemo, useState } from 'react';
import { useListRawMaterials } from '@workspace/api-client-react';
import type { RawMaterial } from '@workspace/api-client-react';
import { FlaskConical, RefreshCw, Search } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { PageBar } from '@/components/store/header';
import { useStore } from '@/lib/store-context';
import { whatsappNumber } from '@/lib/store';
import { formatMoney } from '@/lib/money';
import { useBack } from '@/pages/store/use-back';
import './raw-materials.css';

function enquiryLink(m: RawMaterial, grams: number) {
  const text = `Hello Maya Collection, I would like to ask about this raw material:\n${m.name} (${m.category})\nReference: Hillen99 #${m.source_id}\nListed price: ${formatMoney(m.price, m.currency)} per gram\nQuantity: ${grams} g\nCould you confirm availability and the final price?`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
}

function MaterialCard({ m, index }: { m: RawMaterial; index: number }) {
  const [grams, setGrams] = useState(10);
  const safe = Math.max(1, Math.round(grams) || 1);
  return <article className="mc-raw-card" style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }} data-testid={`card-raw-material-${m.id}`}>
    <div className="mc-raw-top">
      <div className="mc-raw-img">{m.image_url ? <img src={m.image_url} alt={m.name} loading="lazy"/> : <FlaskConical size={22}/>}</div>
      <div style={{ minWidth: 0 }}>
        <h3 data-testid={`text-raw-name-${m.id}`}>{m.name}</h3>
        <span className="mc-raw-cat">{m.category}</span>
        <div className="mc-raw-price" dir="ltr" data-testid={`text-raw-price-${m.id}`}>{formatMoney(m.price, m.currency)} <small>/ gram</small></div>
      </div>
    </div>
    {m.description && <p className="mc-raw-desc">{m.description}</p>}
    <div className="mc-raw-ask">
      <label>Grams<input type="number" min={1} step={1} value={grams} onChange={(e) => setGrams(Number(e.target.value))} aria-label={`Grams of ${m.name}`} data-testid={`input-raw-grams-${m.id}`}/></label>
      <a className="mc-raw-wa" href={enquiryLink(m, safe)} target="_blank" rel="noreferrer" data-testid={`link-raw-whatsapp-${m.id}`}><FaWhatsapp/> Ask on WhatsApp</a>
    </div>
    <div className="mc-raw-note">Estimate for {safe} g: <span dir="ltr">{formatMoney(m.price * safe, m.currency)}</span>. Availability and final price are confirmed personally by Maya. Source: {m.source_url ? <a href={m.source_url} target="_blank" rel="noreferrer">Hillen99</a> : 'Hillen99'}.</div>
  </article>;
}

export default function RawMaterialsPage() {
  const { t } = useStore();
  const back = useBack('/');
  const q = useListRawMaterials();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const items = q.data ?? [];
  const cats = useMemo(() => ['All', ...[...new Set(items.map((m) => m.category).filter(Boolean))].sort()], [items]);
  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((m) => m.published && (cat === 'All' || m.category === cat) && (!s || `${m.name} ${m.category} ${m.description}`.toLowerCase().includes(s)));
  }, [items, search, cat]);

  return <div className="mc-page" data-testid="page-raw-materials">
    <PageBar title={t('rawMaterials')} onBack={back}/>
    <section className="mc-raw-intro">
      <span className="mc-kicker" dir="ltr">MAYA COLLECTION · RAW MATERIALS</span>
      <h2>Perfumery materials, priced per gram.</h2>
      <p>Materials sourced from the Hillen99 catalog in Basra. Prices are listed per gram. Send an enquiry and Maya will confirm availability, quantity and final price with you personally. Nothing is ordered automatically.</p>
    </section>
    <div className="mc-raw-tools">
      <label className="mc-raw-search"><Search size={16}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search materials" aria-label="Search materials" data-testid="input-raw-search"/></label>
      {cats.length > 2 && <div className="mc-raw-chips" role="tablist">{cats.map((c) => <button key={c} className={`mc-raw-chip${cat === c ? ' is-on' : ''}`} onClick={() => setCat(c)} aria-pressed={cat === c} data-testid={`chip-raw-category-${c}`}>{c}</button>)}</div>}
    </div>
    {q.isLoading ? <div className="mc-raw-list" data-testid="state-raw-loading">{[1, 2, 3, 4].map((n) => <div key={n} className="mc-raw-skel"/>)}</div>
      : q.isError ? <div className="mc-state" role="alert" data-testid="state-raw-error"><p>Raw materials could not be loaded.</p><button className="mc-ghost-btn" onClick={() => void q.refetch()} data-testid="button-raw-retry"><RefreshCw size={15}/> {t('retry')}</button></div>
      : items.length === 0 ? <div className="mc-state" data-testid="state-raw-empty"><p>No raw materials are listed yet.</p></div>
      : list.length === 0 ? <div className="mc-state" data-testid="state-raw-no-results"><p>No materials match your search.</p><button className="mc-ghost-btn" onClick={() => { setSearch(''); setCat('All'); }} data-testid="button-raw-clear">Clear search</button></div>
      : <>
        <p className="mc-raw-count" data-testid="text-raw-count">{list.length} of {items.length} materials</p>
        <div className="mc-raw-list">{list.map((m, i) => <MaterialCard key={m.id} m={m} index={i}/>)}</div>
      </>}
  </div>;
}
