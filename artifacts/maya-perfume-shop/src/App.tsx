import { useEffect, useState, type FormEvent } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGetAdminPasscodeStatus, useListProducts, useUnlockAdminPasscode, type Product as ApiProduct } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import AdminPanel from '@/pages/admin-panel';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { ArrowDown, ArrowRight, ChevronDown, Heart, Instagram, Menu, MessageCircle, Minus, Plus, ShoppingBag, X, Facebook, Languages, LockKeyhole } from 'lucide-react';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const IQD_PER_USD = 1500;
const storePhone = '+964 770 157 5609';
const storeAddress = 'Kolak Mall, Mawlawi Street, Sulaymaniyah, Iraq.';
const storeMapLink = 'https://www.google.com/maps/search/?api=1&query=Kolak+Mall%2C+Mawlawi+Street%2C+Sulaymaniyah%2C+Iraq';
const whatsappLink = 'https://wa.me/9647701575609';
type Language = 'en' | 'ku' | 'ar';
type StoreProduct = ApiProduct & { image_url: string; gallery_images: string[] };
type CartLine = { product: StoreProduct; quantity: number; size: number };
const sizes = [25, 50, 100, 150, 200];
const navLinks = [{ href: '/', key: 'home' }, { href: '/about', key: 'about' }, { href: '/collection', key: 'collection' }, { href: '/raw-material', key: 'ingredients' }, { href: '/contact', key: 'contact' }] as const;
const copy: Record<Language, Record<string, string>> = {
  en: {
    home:'Home', about:'Our story', collection:'Collection', ingredients:'Ingredients', contact:'Contact', bag:'Bag', wishlist:'Wishlist', language:'Language',
    banner:'We deliver to all cities and towns in Kurdistan! 📦✨', heroEyebrow:'Maya Collection · Sulaymaniyah', heroTitle:'Find the scent that feels like you.', heroBody:'A personal fragrance journey, curated close to home. Choose your next signature and order directly with us on WhatsApp.',
    shop:'Explore fragrances', signature:'A scent, your own way', edit:'The Maya collection', subtitle:'Thoughtful compositions for every mood, memory and moment.', noProducts:'Our collection is being refreshed. Please visit again shortly.',
    discover:'Discover your next favorite', add:'Add to bag', view:'View fragrance', stock:'Available', sku:'Code', volume:'Pick a volume', quantity:'Quantity', notes:'Scent notes', top:'Top notes', heart:'Heart notes', base:'Base notes', ingredientsTitle:'Ingredients', description:'The story of this scent', inStock:'In stock', soldOut:'Currently unavailable', saved:'Saved fragrances', emptyWish:'Your wishlist is a little quiet.', emptyBag:'Your bag is waiting for a scent that feels like you.',
    subtotal:'Subtotal', checkout:'Continue to checkout', checkoutTitle:'Your delivery details', name:'Full name', phone:'Phone number', address:'Delivery address', prepare:'Prepare WhatsApp order', receiptNote:'Your itemized receipt will open in WhatsApp, ready for you to review and send.', order:'Maya Collection order', size:'Size', total:'Total', customer:'Customer', delivery:'Delivery address', close:'Close', remove:'Remove', browse:'Browse the collection',
    footerStory:'A scent, a story, a signature.', explore:'Explore', support:'Customer care', follow:'Follow us', newsletter:'A little note from Maya', newsletterBody:'New arrivals and thoughtful scent stories, from Sulaymaniyah.', email:'Email address', join:'Join the list', subscribed:'You’re on the list', pages:'Pages', visit:'Visit Maya Collection', map:'Find us on Maps', admin:'Admin Panel', menu:'Open menu', closeMenu:'Close menu', loading:'Finding your collection…',
    aboutTitle:'Fragrance, made personal.', aboutBody:'Maya Collection is a Sulaymaniyah fragrance house built around a simple idea: the right scent should feel like it has always belonged to you.',
    rawTitle:'The notes behind the feeling.', rawBody:'From the first bright impression to the warmth that stays close, every fragrance is a small composition with a story.',
    contactTitle:'Let’s find your scent.', contactBody:'Tell us what you love and our team in Sulaymaniyah will help you choose. We are always happy to talk fragrance.',
    currencyNote:'Approximate local price · 1 USD = 1,500 IQD', exchange:'Approximate conversion only. Not a live exchange rate.', productLabel:'Fragrance'
  },
  ku: {
    home:'ماڵەوە', about:'چیرۆکمان', collection:'کۆمەڵە', ingredients:'پێکهاتەکان', contact:'پەیوەندی', bag:'سەبەتە', wishlist:'دڵخوازەکان', language:'زمان',
    banner:'We deliver to all cities and towns in Kurdistan! 📦✨', heroEyebrow:'کۆڵێکشنی مایا · سلێمانی', heroTitle:'بۆنی تایبەت بە خۆت بدۆزەوە.', heroBody:'گەشتێکی کەسی بۆ دۆزینەوەی بۆنێک کە لە ماڵەوەتەوە نزیکە. هەڵبژێرە و ڕاستەوخۆ لە واتسئاپ داوا بکە.',
    shop:'گەڕان لە بۆنەکان', signature:'بۆنێک بە شێوازی خۆت', edit:'کۆمەڵەی مایا', subtitle:'پێکهاتەی ورد بۆ هەموو هەست و ساتێک.', noProducts:'کۆمەڵەکەمان نوێ دەکرێتەوە. تکایە دواتر سەردانمان بکە.',
    discover:'بۆنی داهاتووت بدۆزەوە', add:'زیادکردن بۆ سەبەتە', view:'بینینی بۆن', stock:'بەردەستە', sku:'کۆد', volume:'قەبارە هەڵبژێرە', quantity:'ژمارە', notes:'تێبینییەکانی بۆن', top:'تێبینیی سەرەتا', heart:'تێبینیی ناوەڕاست', base:'تێبینیی بنەڕەت', ingredientsTitle:'پێکهاتەکان', description:'چیرۆکی ئەم بۆنە', inStock:'بەردەستە', soldOut:'ئێستا بەردەست نییە', saved:'بۆنە دڵخوازەکان', emptyWish:'هێشتا هیچ بۆنێکت پاشەکەوت نەکردووە.', emptyBag:'سەبەتەکەت چاوەڕێی بۆنێکی تایبەتە.',
    subtotal:'کۆی لاوەکی', checkout:'بەردەوامبوون بۆ داواکردن', checkoutTitle:'زانیاری گەیاندن', name:'ناوی تەواو', phone:'ژمارەی تەلەفۆن', address:'ناونیشانی گەیاندن', prepare:'ئامادەکردنی داوا لە واتسئاپ', receiptNote:'وەسڵی وردەکاری لە واتسئاپ دەکرێتەوە بۆ پێداچوونەوە و ناردنی خۆت.', order:'داواکاری کۆڵێکشنی مایا', size:'قەبارە', total:'کۆی گشتی', customer:'کڕیار', delivery:'ناونیشانی گەیاندن', close:'داخستن', remove:'لابردن', browse:'گەڕان لە کۆمەڵەکە',
    footerStory:'بۆنێک، چیرۆکێک، واژۆیەک.', explore:'گەڕان', support:'یارمەتی کڕیار', follow:'شوێنمان بکە', newsletter:'پەیامێکی بچووک لە مایا', newsletterBody:'بۆنە نوێکان و چیرۆکی بۆن لە سلێمانی.', email:'ئیمەیڵ', join:'بەشداربە', subscribed:'ناوت تۆمارکرا', pages:'پەڕەکان', visit:'سەردانی کۆڵێکشنی مایا', map:'شوێنمان لە نەخشە', admin:'بەشی بەڕێوەبەر', menu:'کردنەوەی لیست', closeMenu:'داخستنی لیست', loading:'کۆمەڵەکەت دەدۆزینەوە…',
    aboutTitle:'بۆن، بە شێوازی کەسی.', aboutBody:'کۆڵێکشنی مایا لە سلێمانی لەسەر بیرۆکەیەکی سادە دامەزراوە: بۆنی دروست وەک ئەوەیە هەمیشە هی تۆ بووبێت.',
    rawTitle:'تێبینییەکانی پشت هەستەکە.', rawBody:'لە یەکەم بۆنی ڕوونەوە تا گەرمییەکەی کە دەمێنێتەوە، هەر بۆنێک پێکهاتەیەکی بچووکە لەگەڵ چیرۆکێک.',
    contactTitle:'با بۆنەکەت بدۆزینەوە.', contactBody:'پێمان بڵێ چیت خۆشدەوێت و تیمەکەمان لە سلێمانی یارمەتیت دەدات. بە خۆشحاڵییەوە قسە لەسەر بۆن دەکەین.',
    currencyNote:'نرخی نزیکەیی بە دینار · ١ دۆلار = ١٬٥٠٠ دینار', exchange:'گۆڕینی نزیکەییە، نرخی ڕاستەوخۆی بازاڕ نییە.', productLabel:'بۆن'
  },
  ar: {
    home:'الرئيسية', about:'قصتنا', collection:'المجموعة', ingredients:'المكونات', contact:'اتصل بنا', bag:'الحقيبة', wishlist:'المفضلة', language:'اللغة',
    banner:'We deliver to all cities and towns in Kurdistan! 📦✨', heroEyebrow:'مايا كوليكشن · السليمانية', heroTitle:'اكتشف عطرك الذي يشبهك.', heroBody:'رحلة عطرية شخصية من قلب مدينتنا. اختر عطرك المميز واطلبه مباشرة عبر واتساب.',
    shop:'اكتشف العطور', signature:'عطر بطريقتك', edit:'مجموعة مايا', subtitle:'تركيبات مدروسة لكل مزاج وذكرى ولحظة.', noProducts:'نعمل على تحديث مجموعتنا. يرجى زيارتنا قريباً.',
    discover:'اكتشف عطرك القادم', add:'أضف إلى الحقيبة', view:'عرض العطر', stock:'متوفر', sku:'الرمز', volume:'اختر الحجم', quantity:'الكمية', notes:'ملاحظات العطر', top:'المقدمة', heart:'القلب', base:'القاعدة', ingredientsTitle:'المكونات', description:'حكاية هذا العطر', inStock:'متوفر', soldOut:'غير متوفر حالياً', saved:'العطور المفضلة', emptyWish:'قائمة المفضلة فارغة حالياً.', emptyBag:'حقيبتك بانتظار عطر يشبهك.',
    subtotal:'المجموع الفرعي', checkout:'متابعة الطلب', checkoutTitle:'بيانات التوصيل', name:'الاسم الكامل', phone:'رقم الهاتف', address:'عنوان التوصيل', prepare:'تجهيز الطلب عبر واتساب', receiptNote:'سيُفتح إيصالك المفصل في واتساب لتراجعه وترسله بنفسك.', order:'طلب مايا كوليكشن', size:'الحجم', total:'الإجمالي', customer:'العميل', delivery:'عنوان التوصيل', close:'إغلاق', remove:'إزالة', browse:'تصفح المجموعة',
    footerStory:'عطر، حكاية، توقيع.', explore:'اكتشف', support:'خدمة العملاء', follow:'تابعنا', newsletter:'رسالة صغيرة من مايا', newsletterBody:'عطور جديدة وحكايات جميلة من السليمانية.', email:'البريد الإلكتروني', join:'اشترك', subscribed:'تم تسجيلك', pages:'الصفحات', visit:'زر مايا كوليكشن', map:'موقعنا على الخريطة', admin:'لوحة الإدارة', menu:'فتح القائمة', closeMenu:'إغلاق القائمة', loading:'نجهز مجموعتك…',
    aboutTitle:'العطر، بأسلوب شخصي.', aboutBody:'مايا كوليكشن دار عطور من السليمانية، تنطلق من فكرة بسيطة: يجب أن تشعر أن عطرك المناسب كان دائماً جزءاً منك.',
    rawTitle:'ملاحظات تصنع الإحساس.', rawBody:'من الانطباع الأول المشرق إلى الدفء الذي يبقى قريباً، كل عطر تركيبة صغيرة تحمل حكاية.',
    contactTitle:'لنجد عطرك معاً.', contactBody:'أخبرنا بما تحب وسيساعدك فريقنا في السليمانية على الاختيار. يسعدنا دائماً الحديث عن العطور.',
    currencyNote:'سعر تقريبي بالدينار · 1 دولار = 1,500 دينار', exchange:'تحويل تقريبي وليس سعر صرف مباشر.', productLabel:'عطر'
  }
};
const formatIQD = (usd: number) => `${new Intl.NumberFormat('en-US').format(Math.round(usd * IQD_PER_USD))} IQD`;

function useStore() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('maya-language') as Language) || 'en');
  const t = (key: string) => copy[language][key] || copy.en[key] || key;
  useEffect(() => {
    localStorage.setItem('maya-language', language);
    document.documentElement.lang = language === 'ku' ? 'ckb' : language;
    document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
  }, [language]);
  return { language, setLanguage, t };
}

function StoreApp() {
  const [path, setPath] = useLocation();
  const { language, setLanguage, t } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawer, setDrawer] = useState<'bag' | 'wishlist' | null>(null);
  const catalog = useListProducts({ query: { staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: true, refetchInterval: 60000 } });
  const items = catalog.data ?? [];
  const [wishlist, setWishlist] = useState<number[]>(() => { try { return JSON.parse(localStorage.getItem('maya-wishlist') || '[]') as number[]; } catch { return []; } });
  const [cart, setCart] = useState<CartLine[]>(() => { try { return JSON.parse(localStorage.getItem('maya-cart') || '[]') as CartLine[]; } catch { return []; } });
  useEffect(() => { localStorage.setItem('maya-wishlist', JSON.stringify(wishlist)); }, [wishlist]);
  useEffect(() => { localStorage.setItem('maya-cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }, [path]);
  const count = cart.reduce((n, line) => n + line.quantity, 0);
  const toggleWish = (id: number) => setWishlist((old) => old.includes(id) ? old.filter((x) => x !== id) : [...old, id]);
  const add = (product: ApiProduct, size: number, quantity = 1) => setCart((old) => {
    const item = product as StoreProduct;
    const found = old.find((line) => line.product.id === item.id && line.size === size);
    return found ? old.map((line) => line.product.id === item.id && line.size === size ? { ...line, quantity: line.quantity + quantity } : line) : [...old, { product: item, quantity, size }];
  });
  const changeQty = (id: number, size: number, delta: number) => setCart((old) => old.map((line) => line.product.id === id && line.size === size ? { ...line, quantity: line.quantity + delta } : line).filter((line) => line.quantity > 0));
  const subtotal = cart.reduce((n, line) => n + line.product.price * line.quantity, 0);
  const productMatch = path.match(/^\/product\/(\d+)$/);
  const detailProduct = productMatch ? items.find((p) => p.id === Number(productMatch[1])) : undefined;
  return <main className="maya-store" dir={language === 'en' ? 'ltr' : 'rtl'}>
    <div className="maya-announcement" data-testid="announcement-delivery">{t('banner')}</div>
    <header className="maya-header">
      <div className="maya-header-social"><a href={whatsappLink} target="_blank" rel="noreferrer" aria-label="WhatsApp" data-testid="header-whatsapp"><MessageCircle/></a><a href="https://facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook" data-testid="header-facebook"><Facebook/></a><a href="https://instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram" data-testid="header-instagram"><Instagram/></a></div>
      <div className="maya-header-main">
        <button className="maya-icon-button maya-mobile-menu" onClick={() => setMenuOpen((v) => !v)} aria-label={menuOpen ? t('closeMenu') : t('menu')} data-testid="button-menu"><Menu/></button>
        <Link href="/" className="maya-wordmark" data-testid="link-brand"><span>MAYA</span><small>COLLECTION</small></Link>
        <label className="maya-language"><Languages size={16}/><span className="sr-only">{t('language')}</span><select value={language} onChange={(e) => setLanguage(e.target.value as Language)} aria-label={t('language')} data-testid="select-language"><option value="en">English</option><option value="ku">کوردی</option><option value="ar">العربية</option></select><ChevronDown size={15}/></label>
        <nav className="maya-desktop-nav" aria-label="Main navigation">{navLinks.map((link) => <Link href={link.href} key={link.href} data-testid={`nav-${link.key}`}>{t(link.key)}</Link>)}</nav>
        <div className="maya-actions">
          <button className="maya-icon-button" onClick={() => setMenuOpen((v) => !v)} aria-label={t('menu')} data-testid="button-header-menu"><Menu/></button>
          <button className="maya-icon-button bag-trigger" onClick={() => setDrawer('bag')} aria-label={`${t('bag')} ${count}`} data-testid="button-cart"><ShoppingBag/><span className="maya-count" data-testid="text-cart-count">{count}</span></button>
          <button className="maya-icon-button" onClick={() => setDrawer('wishlist')} aria-label={`${t('wishlist')} ${wishlist.length}`} data-testid="button-wishlist"><Heart/><span className="maya-count" data-testid="text-wishlist-count">{wishlist.length}</span></button>
        </div>
      </div>
      {menuOpen && <nav className="maya-mobile-nav" aria-label="Mobile navigation">{navLinks.map((link) => <Link href={link.href} key={link.href} data-testid={`mobile-nav-${link.key}`}>{t(link.key)}<ArrowRight size={15}/></Link>)}</nav>}
    </header>
    {catalog.isError && <div className="maya-error" role="alert">We could not refresh the live collection. Please try again shortly.</div>}
    <Switch>
      <Route path="/"><Home products={items} loading={catalog.isLoading} t={t}/></Route>
      <Route path="/collection"><Collection products={items} loading={catalog.isLoading} t={t} wishlist={wishlist} toggleWish={toggleWish}/></Route>
      <Route path="/product/:id">{detailProduct ? <ProductDetail product={detailProduct} t={t} wished={wishlist.includes(detailProduct.id)} toggleWish={() => toggleWish(detailProduct.id)} onAdd={(size, qty) => { add(detailProduct, size, qty); setDrawer('bag'); }}/>: <div className="maya-empty">{catalog.isLoading ? t('loading') : t('noProducts')}</div>}</Route>
      <Route path="/about"><TextPage title={t('aboutTitle')} body={t('aboutBody')} t={t}/></Route>
      <Route path="/raw-material"><TextPage title={t('rawTitle')} body={t('rawBody')} t={t}/></Route>
      <Route path="/contact"><TextPage title={t('contactTitle')} body={t('contactBody')} t={t}/></Route>
      <Route><NotFound/></Route>
    </Switch>
    <Footer t={t} language={language} setLanguage={setLanguage}/>
    {drawer && <div className="maya-overlay" onClick={() => setDrawer(null)} role="presentation"><aside className="maya-drawer" onClick={(e) => e.stopPropagation()} aria-label={drawer === 'bag' ? t('bag') : t('wishlist')}><div className="maya-drawer-head"><div><span className="maya-kicker">MAYA COLLECTION</span><h2>{drawer === 'bag' ? `${t('bag')} · ${count}` : t('saved')}</h2></div><button onClick={() => setDrawer(null)} className="maya-icon-button" aria-label={t('close')} data-testid="button-close-drawer"><X/></button></div>
      {drawer === 'bag' ? <BagContents cart={cart} t={t} changeQty={changeQty} subtotal={subtotal} onCheckout={() => setDrawer('bag')}/> : <div className="maya-drawer-items">{items.filter((p) => wishlist.includes(p.id)).map((p) => <div className="maya-cart-line" key={p.id}><Link href={`/product/${p.id}`} className="maya-cart-image"><img src={p.image_url} alt={p.title}/></Link><div className="maya-cart-copy"><Link href={`/product/${p.id}`}><strong>{p.title}</strong></Link><span>{formatIQD(p.price)}</span><button onClick={() => toggleWish(p.id)} className="maya-text-button" data-testid={`button-remove-wishlist-${p.id}`}>{t('remove')}</button></div></div>)}{!wishlist.length && <EmptyPanel text={t('emptyWish')} action={t('browse')} href="/collection"/>}</div>}
      {drawer === 'bag' && cart.length > 0 && <Checkout cart={cart} subtotal={subtotal} t={t}/>}
    </aside></div>}
  </main>;
}

function Home({ products, loading, t }: { products: ApiProduct[]; loading: boolean; t: (key: string) => string }) {
  return <><section className="maya-hero"><img src={products[0]?.image_url || '/images/hero-bottle.jpg'} alt="" className="maya-hero-image"/><div className="maya-hero-overlay"/><div className="maya-hero-content"><span className="maya-kicker">{t('heroEyebrow')}</span><h1>{t('heroTitle')}</h1><p>{t('heroBody')}</p><Link href="/collection" className="maya-primary-link" data-testid="link-hero-collection">{t('shop')} <ArrowRight size={16}/></Link></div><a href="#maya-edit" className="maya-scroll"><ArrowDown size={15}/>{t('discover')}</a></section>
  <section className="maya-section" id="maya-edit"><div className="maya-section-heading"><div><span className="maya-kicker">{t('signature')}</span><h2>{t('edit')}</h2><p>{t('subtitle')}</p></div><Link href="/collection" className="maya-underlink">{t('shop')} <ArrowRight size={15}/></Link></div>{loading ? <div className="maya-skeleton-grid">{[1,2,3,4].map((n)=><div className="maya-skeleton" key={n}/>)}</div> : products.length ? <div className="maya-product-grid">{products.slice(0,4).map((p) => <ProductCard key={p.id} product={p} t={t}/>)}</div> : <p className="maya-empty">{t('noProducts')}</p>}</section>
  <section className="maya-story"><div className="maya-story-image"><img src={products[1]?.image_url || '/images/story-bottle.jpg'} alt="Perfume from Maya Collection"/></div><div className="maya-story-copy"><span className="maya-kicker">{t('about')}</span><h2>{t('aboutTitle')}</h2><p>{t('aboutBody')}</p><Link href="/about" className="maya-underlink">{t('about')} <ArrowRight size={15}/></Link></div></section></>;
}

function ProductCard({ product, t }: { product: ApiProduct; t: (key: string) => string }) {
  return <article className="maya-product-card" data-testid={`card-product-${product.id}`}><Link href={`/product/${product.id}`} className="maya-product-photo" data-testid={`link-product-${product.id}`}><img src={product.image_url || '/images/hero-fragrance.png'} alt={product.title}/><span>{product.category}</span></Link><div className="maya-card-info"><div><Link href={`/product/${product.id}`}><h3>{product.title}</h3></Link><p>{product.brand}</p></div><strong>{formatIQD(product.price)}</strong></div><p className="maya-card-notes">{[...product.top_notes, ...product.heart_notes, ...product.base_notes].slice(0,3).join(' · ')}</p><Link href={`/product/${product.id}`} className="maya-card-cta" data-testid={`button-view-${product.id}`}>{t('view')} <ArrowRight size={14}/></Link></article>;
}
function Collection({ products, loading, t, wishlist, toggleWish }: { products: ApiProduct[]; loading: boolean; t: (key: string) => string; wishlist: number[]; toggleWish: (id: number) => void }) {
  return <><section className="maya-page-intro"><span className="maya-kicker">MAYA COLLECTION · SULAYMANIYAH</span><h1>{t('edit')}</h1><p>{t('subtitle')}</p></section><section className="maya-section maya-collection-grid">{loading ? <div className="maya-skeleton-grid">{[1,2,3,4].map((n)=><div className="maya-skeleton" key={n}/>)}</div> : products.length ? <div className="maya-product-grid">{products.map((p) => <div className="maya-card-wrap" key={p.id}><button onClick={() => toggleWish(p.id)} className={`maya-card-heart ${wishlist.includes(p.id) ? 'is-saved' : ''}`} aria-label={t('wishlist')} data-testid={`button-wishlist-${p.id}`}><Heart/></button><ProductCard product={p} t={t}/></div>)}</div> : <div className="maya-empty">{t('noProducts')}</div>}</section></>;
}
function ProductDetail({ product, t, wished, toggleWish, onAdd }: { product: ApiProduct; t: (key: string) => string; wished: boolean; toggleWish: () => void; onAdd: (size: number, quantity: number) => void }) {
  const images = [product.image_url, ...(product.gallery_images || [])].filter(Boolean).slice(0,2);
  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState(50);
  const [quantity, setQuantity] = useState(1);
  return <section className="maya-detail"><div className="maya-gallery"><div className={`maya-gallery-main ${images.length < 2 ? 'maya-alt-crop' : ''}`}><img src={images[activeImage] || product.image_url || '/images/hero-fragrance.png'} alt={product.title}/><button onClick={toggleWish} className={`maya-detail-heart ${wished ? 'is-saved' : ''}`} aria-label={t('wishlist')} data-testid="button-detail-wishlist"><Heart/></button></div><div className="maya-gallery-dots">{[0,1].map((n)=><button key={n} onClick={() => setActiveImage(n)} className={activeImage === n ? 'active' : ''} aria-label={`View image ${n + 1}`} data-testid={`button-gallery-${n+1}`}/>)}</div></div>
    <div className="maya-detail-info"><span className="maya-kicker">{product.brand} · {product.category}</span><h1>{product.title}</h1><div className="maya-price">{formatIQD(product.price)}</div><p className="maya-currency-note">{t('currencyNote')}<br/>{t('exchange')}</p><p className={`maya-stock ${product.stock > 0 ? '' : 'is-out'}`}>{product.stock > 0 ? `${t('stock')}: ${product.stock}` : t('soldOut')}</p><p className="maya-sku">{t('sku')}: {product.sku}</p>
    <div className="maya-detail-rule"/><h2>{t('volume')}</h2><div className="maya-size-options">{sizes.map((amount)=><button key={amount} onClick={() => setSize(amount)} className={size === amount ? 'selected' : ''} data-testid={`button-size-${amount}`}>{amount} ml</button>)}</div>
    <h2 className="maya-detail-label">{t('quantity')}</h2><div className="maya-quantity"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity" data-testid="button-quantity-minus"><Minus/></button><span data-testid="text-quantity">{quantity}</span><button onClick={() => setQuantity(Math.min(Math.max(1, product.stock), quantity + 1))} aria-label="Increase quantity" data-testid="button-quantity-plus"><Plus/></button></div>
    <button disabled={!product.stock} onClick={() => onAdd(size, quantity)} className="maya-add-button" data-testid="button-add-to-bag">{t('add')} · {formatIQD(product.price)} <ShoppingBag size={17}/></button>
    <p className="maya-description">{product.description}</p>
    <div className="maya-notes"><h2>{t('notes')}</h2>{[['top',product.top_notes],['heart',product.heart_notes],['base',product.base_notes],['ingredientsTitle',product.ingredients]].map(([label, values])=><div className="maya-note-row" key={label as string}><span>{t(label as string)}</span><p>{(values as string[] || []).join(' · ') || '—'}</p></div>)}</div></div></section>;
}
function BagContents({ cart, t, changeQty, subtotal, onCheckout }: { cart: CartLine[]; t: (key: string) => string; changeQty: (id: number, size: number, amount: number) => void; subtotal: number; onCheckout: () => void }) {
  return <><div className="maya-drawer-items">{cart.map(({product,quantity,size})=><div className="maya-cart-line" key={`${product.id}-${size}`}><Link href={`/product/${product.id}`} className="maya-cart-image"><img src={product.image_url} alt={product.title}/></Link><div className="maya-cart-copy"><strong>{product.title}</strong><span>{size} ml · {formatIQD(product.price)}</span><div className="maya-cart-qty"><button onClick={() => changeQty(product.id,size,-1)} aria-label="Remove one" data-testid={`button-minus-${product.id}-${size}`}><Minus size={13}/></button><span>{quantity}</span><button onClick={() => changeQty(product.id,size,1)} aria-label="Add one" data-testid={`button-plus-${product.id}-${size}`}><Plus size={13}/></button></div></div><strong className="maya-line-total">{formatIQD(product.price * quantity)}</strong></div>)}{cart.length === 0 && <EmptyPanel text={t('emptyBag')} action={t('browse')} href="/collection"/>}</div>{cart.length > 0 && <div className="maya-subtotal"><div><span>{t('subtotal')}</span><strong>{formatIQD(subtotal)}</strong></div><small>{t('currencyNote')}</small><button onClick={onCheckout} className="maya-primary-link" data-testid="button-open-checkout">{t('checkout')} <ArrowRight size={15}/></button></div>}</>;
}
function Checkout({ cart, subtotal, t }: { cart: CartLine[]; subtotal: number; t: (key: string) => string }) {
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState({ name:'', phone:'', address:'' });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const rows = cart.map((line) => `• ${line.product.title} — ${line.size} ml × ${line.quantity} = ${formatIQD(line.product.price * line.quantity)}`).join('\n');
    const message = `${t('order')}\n\n${rows}\n\n${t('subtotal')}: ${formatIQD(subtotal)}\n${t('customer')}: ${customer.name}\n${t('phone')}: ${customer.phone}\n${t('delivery')}: ${customer.address}\n\n${t('receiptNote')}`;
    window.open(`https://wa.me/9647701575609?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };
  if (!open) return <div className="maya-checkout-toggle"><p>{t('receiptNote')}</p><button onClick={() => setOpen(true)} className="maya-outline-button" data-testid="button-checkout">{t('checkout')}</button></div>;
  return <form onSubmit={submit} className="maya-checkout-form"><h3>{t('checkoutTitle')}</h3><label>{t('name')}<input required value={customer.name} onChange={(e)=>setCustomer({...customer,name:e.target.value})} data-testid="input-checkout-name"/></label><label>{t('phone')}<input required type="tel" value={customer.phone} onChange={(e)=>setCustomer({...customer,phone:e.target.value})} data-testid="input-checkout-phone"/></label><label>{t('address')}<textarea required value={customer.address} onChange={(e)=>setCustomer({...customer,address:e.target.value})} data-testid="input-checkout-address"/></label><button className="maya-primary-link" data-testid="button-whatsapp-order">{t('prepare')} <MessageCircle size={16}/></button><small>{t('receiptNote')}</small></form>;
}
function EmptyPanel({ text, action, href }: { text: string; action: string; href: string }) { return <div className="maya-empty-panel"><Heart/><p>{text}</p><Link href={href} className="maya-underlink">{action} <ArrowRight size={14}/></Link></div>; }
function TextPage({ title, body, t }: { title: string; body: string; t: (key: string) => string }) { return <section className="maya-page-intro maya-text-page"><span className="maya-kicker">MAYA COLLECTION · SULAYMANIYAH</span><h1>{title}</h1><p>{body}</p><Link href="/collection" className="maya-primary-link">{t('shop')} <ArrowRight size={15}/></Link></section>; }
function Footer({ t, language, setLanguage }: { t: (key: string) => string; language: Language; setLanguage: (language: Language) => void }) {
  const [email,setEmail] = useState('');
  const [sent,setSent] = useState(false);
  const subscribe = (e: FormEvent) => { e.preventDefault(); setSent(true); };
  return <footer className="maya-footer"><div className="maya-footer-top"><div><span className="maya-kicker">{t('newsletter')}</span><h2>{t('footerStory')}</h2><p>{t('newsletterBody')}</p></div><form onSubmit={subscribe} className="maya-newsletter"><label className="sr-only" htmlFor="maya-email">{t('email')}</label><input id="maya-email" type="email" required placeholder={t('email')} value={email} onChange={(e)=>setEmail(e.target.value)} data-testid="input-newsletter"/><button data-testid="button-newsletter">{sent ? t('subscribed') : t('join')} <ArrowRight size={15}/></button></form></div>
    <div className="maya-footer-grid"><div className="maya-footer-brand"><Link href="/" className="maya-wordmark"><span>MAYA</span><small>COLLECTION</small></Link><p>{t('footerStory')}</p><div className="maya-footer-social"><a href={whatsappLink} aria-label="WhatsApp"><MessageCircle/></a><a href="https://facebook.com/" aria-label="Facebook"><Facebook/></a><a href="https://instagram.com/" aria-label="Instagram"><Instagram/></a></div></div><div><h3>{t('pages')}</h3>{navLinks.map((link)=><Link href={link.href} key={link.href}>{t(link.key)}</Link>)}</div><div><h3>{t('support')}</h3><a href="tel:+9647701575609">{storePhone}</a><a href={whatsappLink} target="_blank" rel="noreferrer">WhatsApp</a><a href={storeMapLink} target="_blank" rel="noreferrer">{t('map')}</a></div><div><h3>{t('visit')}</h3><p>{storeAddress}</p><label className="maya-footer-language">{t('language')}<select value={language} onChange={(e)=>setLanguage(e.target.value as Language)} data-testid="footer-language"><option value="en">English</option><option value="ku">کوردی</option><option value="ar">العربية</option></select></label></div></div>
    <div className="maya-footer-bottom"><span>© {new Date().getFullYear()} Maya Collection · {t('footerStory')}</span><Link href="/admin" className="maya-admin-link" data-testid="link-admin">{t('admin')}</Link></div>
  </footer>;
}
function AdminGate() {
  const status = useGetAdminPasscodeStatus();
  const unlock = useUnlockAdminPasscode();
  const [passcode,setPasscode] = useState('');
  const [error,setError] = useState('');
  const unlocked = status.data?.unlocked;
  const submit = async (e: FormEvent) => { e.preventDefault(); setError(''); try { await unlock.mutateAsync({data:{passcode}}); await status.refetch(); } catch { setError('That passcode could not unlock the collection. Please try again.'); } };
  if (status.isLoading) return <div className="maya-admin-gate">Checking private access…</div>;
  if (unlocked) return <AdminPanel/>;
  return <div className="maya-admin-gate"><form onSubmit={submit}><LockKeyhole/><span className="maya-kicker">MAYA COLLECTION · PRIVATE</span><h1>Admin access</h1><p>Enter your administrator passcode to continue.</p><label htmlFor="admin-passcode">Passcode</label><input id="admin-passcode" type="password" required value={passcode} onChange={(e)=>setPasscode(e.target.value)} data-testid="input-admin-passcode"/>{error && <p role="alert">{error}</p>}<button disabled={unlock.isPending} data-testid="button-admin-unlock">{unlock.isPending ? 'Verifying…' : 'Unlock panel'}</button><Link href="/" data-testid="link-admin-store">Return to storefront</Link></form></div>;
}
function App() {
  return <TooltipProvider><WouterRouter base={basePath}><ErrorBoundary><QueryClientProvider client={queryClient}><Switch><Route path="/admin" component={AdminGate}/><Route><StoreApp/></Route></Switch><Toaster/></QueryClientProvider></ErrorBoundary></WouterRouter></TooltipProvider>;
}
export default App;
