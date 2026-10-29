import { Link, useLocation } from 'wouter';
import { ArrowRight, Minus, Plus, Trash2 } from 'lucide-react';
import { PageBar } from '@/components/store/header';
import { formatIQD } from '@/lib/store';
import { useStore } from '@/lib/store-context';
import { EmptyState } from '@/pages/store/wishlist';
import { useBack } from '@/pages/store/use-back';

export function BagSummary({ compact = false }: { compact?: boolean }) {
  const { t, subtotal } = useStore();
  return <div className={`mc-summary ${compact ? 'is-compact' : ''}`}>
    <div><span>{t('subtotal')}</span><strong dir="ltr" data-testid="text-subtotal">{formatIQD(subtotal)}</strong></div>
    <div><span>{t('delivery')}</span><em>{t('deliveryValue')}</em></div>
    <div className="is-total"><span>{t('totalBefore')}</span><strong dir="ltr" data-testid="text-total">{formatIQD(subtotal)}</strong></div>
    <small>{t('currencyNote')}</small>
  </div>;
}

export default function Bag() {
  const { t, cart, count, changeQty, removeLine } = useStore();
  const back = useBack('/');
  const [, navigate] = useLocation();
  return <div className="mc-page mc-bag">
    <PageBar title={t('yourBag')} onBack={back} right={count ? <span className="mc-pill">{count}</span> : undefined}/>
    {!cart.length ? <EmptyState icon="bag" text={t('emptyBag')} action={t('browse')}/> : <div className="mc-bag-layout">
      <ul className="mc-lines">
        {cart.map(({ product, quantity, size }) => <li key={`${product.id}-${size}`} className="mc-line" data-testid={`line-${product.id}-${size}`}>
          <Link href={`/product/${product.id}`} className="mc-line-img"><img src={product.image_url || '/images/hero-fragrance.png'} alt={product.title}/></Link>
          <div className="mc-line-copy">
            <Link href={`/product/${product.id}`}><strong>{product.title}</strong></Link>
            <span dir="ltr">{size} ml · {formatIQD(product.price)}</span>
            <div className="mc-line-actions">
              <div className="mc-qty is-small">
                <button onClick={() => changeQty(product.id, size, -1)} aria-label="-" data-testid={`button-minus-${product.id}-${size}`}><Minus size={14}/></button>
                <span>{quantity}</span>
                <button onClick={() => changeQty(product.id, size, 1)} aria-label="+" data-testid={`button-plus-${product.id}-${size}`}><Plus size={14}/></button>
              </div>
              <button className="mc-remove" onClick={() => removeLine(product.id, size)} aria-label={`${t('remove')} ${product.title}`} data-testid={`button-remove-${product.id}-${size}`}><Trash2 size={16}/></button>
            </div>
          </div>
          <strong className="mc-line-total" dir="ltr">{formatIQD(product.price * quantity)}</strong>
        </li>)}
      </ul>
      <aside className="mc-bag-side">
        <BagSummary/>
        <button className="mc-teal-btn is-block" onClick={() => navigate('/checkout')} data-testid="button-proceed-checkout">{t('proceed')} <ArrowRight size={17} className="mc-flip"/></button>
        <p className="mc-fine is-center">{t('receiptNote')}</p>
      </aside>
    </div>}
  </div>;
}
