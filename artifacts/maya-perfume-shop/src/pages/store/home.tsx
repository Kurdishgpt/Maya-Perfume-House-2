import { Link } from 'wouter';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { GoldDivider } from '@/components/store/brand';
import { CategoryGrid } from '@/components/store/category-icons';
import { CardSkeletons, ProductCard } from '@/components/store/product-card';
import { useStore } from '@/lib/store-context';

export default function Home() {
  const { t, products, loading, isError, refetch } = useStore();
  return <div className="mc-page mc-home">
    <section className="mc-brandhead">
      <h1 dir="ltr">MAYA COLLECTION</h1>
      <p>{t('brandTagline')}</p>
      <GoldDivider/>
    </section>

    <section className="mc-banner" aria-labelledby="banner-title">
      <img src="/images/banner-regal.jpg" alt="" className="mc-banner-img"/>
      <div className="mc-banner-copy">
        <span className="mc-banner-kicker">{t('newArrivals')}</span>
        <h2 id="banner-title">{t('bannerTitle')}</h2>
        <Link href="/collection" className="mc-gold-btn" data-testid="link-shop-now">{t('shopNow')} <ArrowRight size={16} className="mc-flip"/></Link>
      </div>
    </section>

    <section className="mc-section">
      <h2 className="mc-h2">{t('categories')}</h2>
      <CategoryGrid/>
    </section>

    <section className="mc-section">
      <div className="mc-store-head"><span className="mc-rule"/><h2 className="mc-h2 is-center">{t('ourStore')}</h2><span className="mc-rule"/></div>
      {loading ? <CardSkeletons/> : isError && !products.length ? <div className="mc-state" role="alert"><p>{t('loadError')}</p><button className="mc-ghost-btn" onClick={refetch} data-testid="button-retry-catalog"><RefreshCw size={15}/> {t('retry')}</button></div>
        : products.length ? <div className="mc-grid">{products.slice(0, 9).map((p, i) => <ProductCard key={p.id} product={p} index={i}/>)}</div>
        : <div className="mc-state"><p>{t('noProducts')}</p></div>}
      {products.length > 9 && <div className="mc-more"><Link href="/collection" className="mc-ghost-btn" data-testid="link-more-products">{t('explore')} <ArrowRight size={15} className="mc-flip"/></Link></div>}
    </section>
  </div>;
}
