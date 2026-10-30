import { useState, type FormEvent } from 'react';
import { useLocation } from 'wouter';
import { Check, FlaskConical, MessageCircle, Pencil } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { PageBar } from '@/components/store/header';
import { whatsappNumber } from '@/lib/store';
import { formatMoney, formatTotals } from '@/lib/money';
import { useStore } from '@/lib/store-context';
import { BagSummary } from '@/pages/store/bag';
import { EmptyState } from '@/pages/store/wishlist';

type Details = { name: string; phone: string; city: string; address: string; notes: string };
type Step = 'details' | 'review' | 'done';

export default function Checkout() {
  const { t, cart, rawMaterialCart, subtotal, clearCart } = useStore();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>('details');
  const [d, setD] = useState<Details>(() => { try { return { name: '', phone: '', city: '', address: '', notes: '', ...JSON.parse(localStorage.getItem('maya-checkout') || '{}') }; } catch { return { name: '', phone: '', city: '', address: '', notes: '' }; } });
  const [errors, setErrors] = useState<Partial<Record<keyof Details, string>>>({});
  const [link, setLink] = useState('');

  const set = (k: keyof Details, v: string) => { setD((o) => ({ ...o, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined })); };
  const validate = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    (['name', 'phone', 'city', 'address'] as const).forEach((k) => { if (!d[k].trim()) next[k] = t('required'); });
    if (d.phone.trim() && d.phone.replace(/\D/g, '').length < 7) next.phone = t('invalidPhone');
    setErrors(next);
    if (Object.keys(next).length) return;
    localStorage.setItem('maya-checkout', JSON.stringify({ name: d.name, phone: d.phone, city: d.city, address: d.address }));
    setStep('review'); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const send = () => {
    const rows = [
      ...cart.map((l) => `- ${l.product.title} (${l.product.sku}) - ${l.size ? `${l.size} ml` : t('sizeUnknown')} x ${l.quantity} = ${formatMoney(l.product.price * l.quantity, l.product.currency)}`),
      ...rawMaterialCart.map((line) => `- Raw material: ${line.name} (Hillen99 #${line.source_id}) - ${line.quantity} ${line.unit === 'g' ? 'g' : 'item(s)'} x ${formatMoney(line.price, line.currency)} per ${line.unit === 'g' ? 'g' : 'item'} = ${formatMoney(line.price * line.quantity, line.currency)} (estimate)`),
    ].join('\n');
    const rawMaterialNote = rawMaterialCart.length
      ? '\n\nMaya will confirm raw-material availability and final prices before the order is finalized.'
      : '';
    const message = `${t('order')}\n\n${rows}\n\n${t('subtotal')}: ${formatTotals(subtotal)}${rawMaterialNote}\n${t('delivery')}: ${t('deliveryValue')}\n${t('payment')}: ${t('payWhatsapp')}\n\n${t('customer')}: ${d.name}\n${t('phone')}: ${d.phone}\n${t('city')}: ${d.city}\n${t('deliveryAddr')}: ${d.address}${d.notes.trim() ? `\n${t('notesField')}: ${d.notes}` : ''}`;
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    setLink(url);
    window.open(url, '_blank', 'noopener,noreferrer');
    setStep('done'); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (step === 'done') return <div className="mc-page">
    <section className="mc-confirm" data-testid="state-order-ready">
      <span className="mc-confirm-ring"><Check/></span>
      <h1>{t('confirmTitle')}</h1>
      <p>{t('confirmBody')}</p>
      <a href={link} target="_blank" rel="noreferrer" className="mc-teal-btn is-block" data-testid="link-reopen-whatsapp"><FaWhatsapp/> {t('reopen')}</a>
      <button className="mc-ghost-btn is-block" onClick={() => { clearCart(); navigate('/'); }} data-testid="button-clear-bag">{t('clearBag')}</button>
    </section>
  </div>;

  if (!cart.length && !rawMaterialCart.length) return <div className="mc-page"><PageBar title={t('checkoutTitle')} onBack={() => navigate('/bag')}/><EmptyState icon="bag" text={t('emptyBag')} action={t('browse')}/></div>;

  const steps: Step[] = ['details', 'review', 'done'];
  return <div className="mc-page mc-checkout">
    <PageBar title={t('checkoutTitle')} onBack={() => step === 'review' ? setStep('details') : navigate('/bag')}/>
    <ol className="mc-steps">{steps.map((s, i) => <li key={s} className={s === step ? 'is-active' : steps.indexOf(step) > i ? 'is-done' : ''}><span>{i + 1}</span>{t(s === 'details' ? 'stepDetails' : s === 'review' ? 'stepReview' : 'stepDone')}</li>)}</ol>
    <div className="mc-bag-layout">
      {step === 'details' ? <form className="mc-form" onSubmit={validate} noValidate>
        {(['name', 'phone', 'city'] as const).map((k) => <label key={k} className={errors[k] ? 'has-error' : ''}><span>{t(k)} *</span>
          <input value={d[k]} onChange={(e) => set(k, e.target.value)} type={k === 'phone' ? 'tel' : 'text'} inputMode={k === 'phone' ? 'tel' : undefined} autoComplete={k === 'name' ? 'name' : k === 'phone' ? 'tel' : 'address-level2'} aria-invalid={!!errors[k]} data-testid={`input-checkout-${k}`}/>
          {errors[k] && <small role="alert">{errors[k]}</small>}</label>)}
        <label className={errors.address ? 'has-error' : ''}><span>{t('address')} *</span><textarea value={d.address} onChange={(e) => set('address', e.target.value)} autoComplete="street-address" aria-invalid={!!errors.address} data-testid="input-checkout-address"/>{errors.address && <small role="alert">{errors.address}</small>}</label>
        <label><span>{t('notesField')}</span><textarea value={d.notes} onChange={(e) => set('notes', e.target.value)} data-testid="input-checkout-notes"/></label>
        <fieldset className="mc-pay"><legend>{t('payment')}</legend>
          <label className="mc-pay-option"><input type="radio" name="pay" checked readOnly data-testid="radio-payment-whatsapp"/><span><MessageCircle size={18}/>{t('payWhatsapp')}</span></label>
          <small>{t('payNote')}</small>
        </fieldset>
        <button className="mc-teal-btn is-block" data-testid="button-review-order">{t('reviewOrder')}</button>
      </form> : <section className="mc-review">
        <div className="mc-review-card"><div className="mc-review-head"><h3>{t('customer')}</h3><button onClick={() => setStep('details')} className="mc-text-btn" data-testid="button-edit-details"><Pencil size={14}/> {t('editDetails')}</button></div>
          <dl><dt>{t('name')}</dt><dd>{d.name}</dd><dt>{t('phone')}</dt><dd dir="ltr">{d.phone}</dd><dt>{t('city')}</dt><dd>{d.city}</dd><dt>{t('address')}</dt><dd>{d.address}</dd>{d.notes.trim() && <><dt>{t('notesField')}</dt><dd>{d.notes}</dd></>}<dt>{t('payment')}</dt><dd>{t('payWhatsapp')}</dd></dl></div>
        <button className="mc-teal-btn is-block is-whatsapp" onClick={send} data-testid="button-whatsapp-order"><FaWhatsapp/> {t('sendWhatsapp')}</button>
        <p className="mc-fine is-center">{t('receiptNote')}</p>
      </section>}
      <aside className="mc-bag-side">
        <div className="mc-review-card"><h3>{t('orderSummary')}</h3>
           <ul className="mc-mini-lines">
             {cart.map((l) => <li key={`${l.product.id}-${l.size}`}><img src={l.product.image_url || '/images/hero-fragrance.png'} alt=""/><span><strong>{l.product.title}</strong><small dir="ltr">{l.size ? `${l.size} ml` : t('sizeUnknown')} x {l.quantity}</small></span><em dir="ltr">{formatMoney(l.product.price * l.quantity, l.product.currency)}</em></li>)}
             {rawMaterialCart.map((line) => <li key={`raw-${line.id}`}>
               {line.image_url ? <img src={line.image_url} alt=""/> : <span className="mc-mini-material-icon"><FlaskConical size={18}/></span>}
               <span><strong>{line.name}</strong><small dir="ltr">{line.quantity} {line.unit === 'g' ? 'g' : 'item(s)'} · estimate</small></span>
               <em dir="ltr">{formatMoney(line.price * line.quantity, line.currency)}</em>
             </li>)}
           </ul>
          <BagSummary compact/>
        </div>
      </aside>
    </div>
  </div>;
}
