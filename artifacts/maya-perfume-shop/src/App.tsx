import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter, Link } from 'wouter';
import { ArrowDown, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Instagram, MapPin, Menu, MessageCircle, Minus, Phone, Plus, ShoppingBag, X } from 'lucide-react';

const queryClient = new QueryClient();
const storePhone = '+964 770 157 5609';
const storePhoneLink = 'tel:+9647701575609';
const storeAddress = 'Kolak Mall, Mawlawi Street, Sulaymaniyah, Iraq.';
const storeMapLink = 'https://www.google.com/maps/search/?api=1&query=Kolak+Mall%2C+Mawlawi+Street%2C+Sulaymaniyah%2C+Iraq';
const whatsappLink = 'https://wa.me/9647701575609';
type Product = { id: number; name: string; family: string; notes: string; price: number; image: string; color: string; size: string; };
const products: Product[] = [
  { id: 1, name: 'Rose No. 04', family: 'Floral · Powdery', notes: 'Damask rose, pink pepper, soft musk', price: 89, image: '/images/rose-noir.jpg', color: '#e9d2ce', size: '50 ml' },
  { id: 2, name: 'Oud Étoile', family: 'Woody · Amber', notes: 'Black oud, saffron, warm cedar', price: 112, image: '/images/oud-supreme.jpg', color: '#d3ded4', size: '50 ml' },
  { id: 3, name: 'Belle Éclat', family: 'Citrus · Floral', notes: 'Bergamot, orange blossom, white tea', price: 94, image: '/images/belle-eclat.jpg', color: '#d0e8e3', size: '50 ml' },
  { id: 4, name: 'Lumière', family: 'Fresh · Musk', notes: 'Neroli, clean linen, skin musk', price: 86, image: '/images/lumiere.jpg', color: '#e8ddbd', size: '50 ml' },
  { id: 5, name: 'Éternel Blanc', family: 'Soft · Gourmand', notes: 'Vanilla orchid, almond, cashmere wood', price: 98, image: '/images/eternel-blanc.jpg', color: '#eee4d8', size: '50 ml' },
  { id: 6, name: 'Jardin Secret', family: 'Green · Floral', notes: 'Fig leaf, jasmine, wild gardenia', price: 92, image: '/images/story-bottle.jpg', color: '#d9e5d6', size: '50 ml' },
];
const paths = [{ href: '/', label: 'Home' }, { href: '/about', label: 'About' }, { href: '/collection', label: 'Collection' }, { href: '/raw-material', label: 'Raw Material' }, { href: '/contact', label: 'Contact' }];
type CartLine = { product: Product; quantity: number };

function AppShell({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>(() => {
    try { return JSON.parse(localStorage.getItem('maya-cart') || '[]') as CartLine[]; } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('maya-cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }, [path]);
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  const addToCart = (product: Product) => setCart((current) => {
    const found = current.find((line) => line.product.id === product.id);
    return found ? current.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { product, quantity: 1 }];
  });
  const adjust = (id: number, amount: number) => setCart((current) => current.map((line) => line.product.id === id ? { ...line, quantity: line.quantity + amount } : line).filter((line) => line.quantity > 0));
  return <div className="min-h-[100dvh]">
    <div className="bg-[#17494a] px-4 py-2 text-center text-[10px] tracking-[.16em] text-[#e8f3ef]">A little ritual, delivered with care · Discover your signature</div>
    <header className="sticky top-0 z-40 border-b border-[#17494a]/10 bg-[#f3f8f4]/95 backdrop-blur-md">
      <div className="mx-auto flex h-[78px] max-w-[1440px] items-center justify-between px-5 md:px-10">
        <button aria-label="Open menu" onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-[#17494a] md:hidden" data-testid="button-menu"><Menu size={20}/></button>
        <Link href="/" className="flex min-w-[174px] flex-col items-center text-[#17494a]" data-testid="link-brand">
          <span className="serif text-[23px] leading-6 tracking-[.12em]">MAYA</span><span className="text-[9px] font-medium tracking-[.31em]">COLLECTION</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">{paths.map((item) => <Link key={item.href} href={item.href} className={`nav-link text-[10px] font-medium uppercase tracking-[.14em] ${path === item.href ? 'active' : ''}`} data-testid={`link-nav-${item.label.toLowerCase().replace(' ', '-')}`}>{item.label}</Link>)}</nav>
        <button onClick={() => setCartOpen(true)} className="relative flex items-center gap-2 p-2 text-[#17494a]" aria-label={`Open bag, ${count} items`} data-testid="button-cart"><ShoppingBag size={19} strokeWidth={1.5}/><span className="hidden text-[10px] uppercase tracking-widest sm:inline">Bag</span><span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#b59b66] px-1 text-[9px] text-white" data-testid="text-cart-count">{count}</span></button>
      </div>
      {mobileOpen && <nav className="absolute left-0 right-0 top-full grid border-t border-[#17494a]/10 bg-[#f3f8f4] px-6 py-3 shadow-lg md:hidden" aria-label="Mobile navigation">{paths.map((item) => <Link key={item.href} href={item.href} className="border-b border-[#17494a]/10 py-4 text-[11px] uppercase tracking-[.18em]" data-testid={`link-mobile-${item.label.toLowerCase().replace(' ', '-')}`}>{item.label}</Link>)}</nav>}
    </header>
    <AddContext.Provider value={addToCart}>{children}</AddContext.Provider>
    <Footer/>
    {cartOpen && <div className="fixed inset-0 z-50 flex justify-end bg-[#0b2627]/45" onClick={() => setCartOpen(false)}><aside onClick={(event) => event.stopPropagation()} className="flex h-full w-full max-w-[430px] flex-col bg-[#f3f8f4] p-6 shadow-2xl sm:p-8" aria-label="Shopping bag">
      <div className="flex items-center justify-between border-b border-[#17494a]/15 pb-5"><div><p className="eyebrow">Your edit</p><h2 className="serif mt-1 text-2xl">The fragrance bag <span className="text-base">({count})</span></h2></div><button onClick={() => setCartOpen(false)} className="p-2" aria-label="Close bag" data-testid="button-close-cart"><X size={20}/></button></div>
      {cart.length === 0 ? <div className="flex flex-1 flex-col items-center justify-center text-center"><ShoppingBag className="mb-5 text-[#8caeaa]" size={34} strokeWidth={1}/><p className="serif text-2xl">A beautiful beginning.</p><p className="mt-2 max-w-[240px] text-sm leading-6 text-[#557170]">Your bag is waiting for a scent that feels like you.</p><Link href="/collection" onClick={() => setCartOpen(false)} className="mt-7 border-b border-[#17494a] pb-1 text-[10px] uppercase tracking-[.15em]">Explore the collection</Link></div> :
        <><div className="flex-1 divide-y divide-[#17494a]/15 overflow-y-auto">{cart.map(({ product, quantity }) => <div key={product.id} className="flex gap-4 py-5"><div className="image-wash h-24 w-20 shrink-0 bg-[#e4efea]"><img src={product.image} alt={product.name} className="h-full w-full object-cover mix-blend-multiply"/></div><div className="flex flex-1 flex-col justify-between"><div className="flex justify-between gap-3"><div><p className="serif text-lg">{product.name}</p><p className="mt-1 text-[10px] tracking-wider text-[#66807d]">{product.size}</p></div><span className="text-sm">${product.price}</span></div><div className="flex items-center gap-3"><button onClick={() => adjust(product.id, -1)} aria-label={`Remove one ${product.name}`} className="p-1" data-testid={`button-minus-${product.id}`}><Minus size={13}/></button><span className="text-xs">{quantity}</span><button onClick={() => adjust(product.id, 1)} aria-label={`Add one ${product.name}`} className="p-1" data-testid={`button-plus-${product.id}`}><Plus size={13}/></button></div></div></div>)}</div><div className="border-t border-[#17494a]/20 pt-5"><div className="flex justify-between text-sm"><span>Subtotal</span><span>${cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0)}.00</span></div><p className="mt-3 text-xs leading-5 text-[#66807d]">This is a browsing bag only. Reach out to us to arrange your order.</p><Link href="/contact" onClick={() => setCartOpen(false)} className="mt-5 block bg-[#17494a] px-6 py-4 text-center text-[10px] uppercase tracking-[.18em] text-white transition-colors hover:bg-[#226466]" data-testid="link-bag-contact">Enquire about your edit <ArrowRight className="ml-2 inline" size={14}/></Link></div></>}
    </aside></div>}
  </div>;
}
import { createContext, useContext } from 'react';
const AddContext = createContext<(product: Product) => void>(() => {});
function useAddToCart() { return useContext(AddContext); }

function Meta({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    document.title = `${title} | Maya Collection`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'description'); document.head.appendChild(meta); }
    meta.setAttribute('content', description);
  }, [title, description]);
  return null;
}
function ButtonLink({ href, children, light = false }: { href: string; children: ReactNode; light?: boolean }) {
  return <Link href={href} className={`group inline-flex items-center gap-3 px-6 py-4 text-[10px] uppercase tracking-[.17em] transition-colors ${light ? 'border border-[#17494a]/45 text-[#17494a] hover:bg-[#17494a] hover:text-[#f3f8f4]' : 'bg-[#17494a] text-[#f3f8f4] hover:bg-[#246668]'}`} data-testid={`link-cta-${href.replace('/', '') || 'home'}`}>{children}<ArrowRight size={15} className="transition-transform group-hover:translate-x-1"/></Link>;
}
function ProductCard({ product }: { product: Product }) {
  const add = useAddToCart();
  return <article className="group" data-testid={`card-product-${product.id}`}>
    <div className="image-wash relative aspect-[.85] bg-[#e5f0eb]">
      <img src={product.image} alt={`${product.name} fragrance`} className="h-full w-full object-contain mix-blend-multiply"/>
      <span className="absolute left-4 top-4 bg-[#f3f8f4]/80 px-3 py-2 text-[9px] uppercase tracking-[.13em]">{product.family.split(' · ')[0]}</span>
      <button onClick={() => add(product)} className="absolute bottom-0 left-0 right-0 translate-y-full bg-[#17494a] py-4 text-[10px] uppercase tracking-[.17em] text-white transition-transform duration-300 group-hover:translate-y-0 focus:translate-y-0" data-testid={`button-add-${product.id}`}>Add to bag · ${product.price}</button>
    </div>
    <div className="flex items-start justify-between pt-4"><div><h3 className="serif text-xl">{product.name}</h3><p className="mt-1 text-[10px] tracking-wide text-[#66807d]">{product.family}</p></div><span className="pt-1 text-xs">${product.price}</span></div>
    <p className="mt-2 text-xs leading-5 text-[#587472]">{product.notes}</p>
  </article>;
}
function ProductRail({ products: items, id }: { products: Product[]; id: string }) {
  const railRef = useRef<HTMLDivElement>(null);
  const scrollRail = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.max(rail.clientWidth * 0.82, 280), behavior: 'smooth' });
  };
  return <div>
    <div className="mb-4 flex justify-end gap-2">
      <button onClick={() => scrollRail(-1)} aria-label="Scroll fragrances left" aria-controls={id} className="grid h-10 w-10 place-items-center border border-[#17494a]/30 text-[#17494a] transition-colors hover:bg-[#17494a] hover:text-white" data-testid={`button-scroll-left-${id}`}><ChevronLeft size={17}/></button>
      <button onClick={() => scrollRail(1)} aria-label="Scroll fragrances right" aria-controls={id} className="grid h-10 w-10 place-items-center border border-[#17494a]/30 text-[#17494a] transition-colors hover:bg-[#17494a] hover:text-white" data-testid={`button-scroll-right-${id}`}><ChevronRight size={17}/></button>
    </div>
    <div ref={railRef} id={id} className="product-rail flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-5 md:gap-7" aria-label="Fragrances, scroll horizontally">
      {items.map((product) => <div key={product.id} className="w-[78vw] max-w-[320px] shrink-0 snap-start sm:w-[43vw] md:w-[31vw] lg:w-[24%]"><ProductCard product={product}/></div>)}
    </div>
  </div>;
}
function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const onSubmit = (event: FormEvent) => { event.preventDefault(); if (email.includes('@')) setSubscribed(true); };
  return <>
  <section className="story-marquee" aria-label="Our story">
    <p className="sr-only">Our story: Maya Collection brings together thoughtful fragrances to make everyday moments feel personal.</p>
    <div className="story-marquee-track" aria-hidden="true">
      <span>OUR STORY&nbsp; · &nbsp;MAYA COLLECTION BRINGS TOGETHER THOUGHTFUL FRAGRANCES TO MAKE EVERYDAY MOMENTS FEEL PERSONAL&nbsp; · &nbsp;</span>
      <span>OUR STORY&nbsp; · &nbsp;MAYA COLLECTION BRINGS TOGETHER THOUGHTFUL FRAGRANCES TO MAKE EVERYDAY MOMENTS FEEL PERSONAL&nbsp; · &nbsp;</span>
    </div>
  </section>
  <footer className="bg-[#12383a] text-[#eff6f1]">
    <div className="hidden md:block">
      <div className="mx-auto grid max-w-[1300px] gap-10 px-6 py-14 md:grid-cols-[1.15fr_.85fr] md:items-center md:px-12 md:py-16">
        <div><p className="eyebrow text-[#b7cfca]">Notes from Maya</p><h2 className="serif mt-3 max-w-lg text-3xl leading-snug md:text-[38px]">Stay in the scent of something lovely.</h2><p className="mt-3 max-w-md text-sm leading-6 text-[#b7cfca]">New fragrances, thoughtful rituals and little things worth keeping close.</p></div>
        <form onSubmit={onSubmit} className="flex border-b border-[#dce9e3]/40" aria-label="Newsletter signup"><label htmlFor="newsletter-email" className="sr-only">Email address</label><input required type="email" id="newsletter-email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-[#9eb7b1]" data-testid="input-newsletter-email"/><button className="px-2 text-[10px] uppercase tracking-[.15em] text-[#d4c49d]" data-testid="button-newsletter">{subscribed ? <><Check size={16} className="inline mr-2"/>You’re on the list</> : <>Join us <ArrowRight className="ml-2 inline" size={14}/></>}</button></form>
      </div>
      <div className="border-t border-white/15"><div className="mx-auto grid max-w-[1300px] gap-10 px-6 py-10 sm:grid-cols-2 md:grid-cols-[1.3fr_1fr_1fr_1fr] md:px-12">
        <div><Link href="/" className="serif text-2xl tracking-[.1em]">MAYA<br/><span className="font-sans text-[9px] tracking-[.3em]">COLLECTION</span></Link><p className="mt-5 max-w-[230px] text-xs leading-6 text-[#b7cfca]">Fragrance for the moments that become part of you.</p><div className="mt-5 flex gap-4"><a href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook" className="footer-link text-xs" data-testid="link-facebook">Facebook</a><a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram" className="footer-link text-xs" data-testid="link-instagram"><Instagram size={15}/></a><a href="https://www.tiktok.com/" target="_blank" rel="noreferrer" aria-label="TikTok" className="footer-link text-xs" data-testid="link-tiktok">TikTok</a></div></div>
        <div><p className="eyebrow text-[#d4c49d]">Discover</p><div className="mt-5 grid gap-3 text-xs text-[#c6d7d2]">{paths.slice(1,4).map((link) => <Link key={link.href} href={link.href} className="footer-link" data-testid={`footer-${link.label.toLowerCase().replace(' ', '-')}`}>{link.label}</Link>)}</div></div>
        <div><p className="eyebrow text-[#d4c49d]">A little help</p><div className="mt-5 grid gap-3 text-xs text-[#c6d7d2]"><Link href="/contact" className="footer-link">Get in touch</Link><a href={storePhoneLink} className="footer-link" data-testid="link-footer-phone">{storePhone}</a><Link href="/raw-material" className="footer-link">Our ingredients</Link></div></div>
        <div><p className="eyebrow text-[#d4c49d]">Visit Maya Collection</p><p className="mt-5 text-xs leading-6 text-[#c6d7d2]">Maya Collection perfumes<br/>{storeAddress}</p><a href={storeMapLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#d4c49d]" data-testid="link-map-search">Find us on Maps <ArrowRight size={12}/></a></div>
      </div></div>
      <div className="border-t border-white/15 px-6 py-5 text-center text-[9px] tracking-[.1em] text-[#a8c1bb]">© {new Date().getFullYear()} Maya Collection. A scent, a story, a signature.</div>
    </div>
    <div className="md:hidden"><MobileFooter/></div>
  </footer>
  </>;
}
function MobileFooter() {
  return <div className="mobile-footer px-7 pb-8 pt-9 text-white">
    <div className="mx-auto max-w-[500px]">
      <Link href="/" className="mx-auto mb-7 block w-fit" aria-label="Maya Collection home" data-testid="mobile-footer-logo">
        <img src="/images/maya-monogram.jpg" alt="Maya Collection Fashion House" className="h-[132px] w-[122px] object-contain"/>
      </Link>
      <div className="mobile-footer-groups border-y border-white/20">
        <details className="mobile-footer-details group border-b border-white/20">
          <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-[17px]"><span>Language</span><ChevronDown size={18} className="transition-transform group-open:rotate-180"/></summary>
          <div className="pb-5 text-sm text-white/75">English <span className="ml-2 text-xs uppercase tracking-widest text-white/50">Current</span></div>
        </details>
        <details className="mobile-footer-details group border-b border-white/20">
          <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-[17px]"><span>Pages</span><ChevronDown size={18} className="transition-transform group-open:rotate-180"/></summary>
          <nav className="grid gap-4 pb-5 text-sm text-white/75" aria-label="Footer pages">
            {paths.map((link) => <Link key={link.href} href={link.href} className="footer-link" data-testid={`mobile-footer-${link.label.toLowerCase().replace(' ', '-')}`}>{link.label}</Link>)}
          </nav>
        </details>
        <details className="mobile-footer-details group">
          <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-[17px]"><span>Customer Support</span><ChevronDown size={18} className="transition-transform group-open:rotate-180"/></summary>
          <div className="grid gap-4 pb-5 text-sm text-white/75">
            <a href={storePhoneLink} className="footer-link">{storePhone}</a>
            <a href={whatsappLink} target="_blank" rel="noreferrer" className="footer-link">Message us on WhatsApp</a>
            <Link href="/contact" className="footer-link">Contact Maya Collection</Link>
          </div>
        </details>
      </div>
      <div className="grid gap-8 py-8">
        <a href={storePhoneLink} className="flex items-center gap-5 text-[21px] leading-tight" data-testid="mobile-footer-phone"><Phone size={22} strokeWidth={1.7}/><span>{storePhone}</span></a>
        <a href={storeMapLink} target="_blank" rel="noreferrer" className="flex items-start gap-5 text-[19px] leading-[1.5]" data-testid="mobile-footer-address">
          <MapPin size={23} className="mt-1 shrink-0" fill="currentColor" strokeWidth={1.5}/>
          <span><span className="mb-1 block text-[21px]">Maya Collection perfumes</span>{storeAddress}</span>
        </a>
      </div>
      <div className="flex items-center justify-between border-t border-white/30 pt-6">
        <span className="text-[17px]">Follow us on</span>
        <div className="flex items-center gap-6">
          <a href={whatsappLink} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="footer-link" data-testid="mobile-footer-whatsapp"><MessageCircle size={24}/></a>
          <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram" className="footer-link" data-testid="mobile-footer-instagram"><Instagram size={24}/></a>
        </div>
      </div>
    </div>
  </div>;
}
function Home() {
  return <><Meta title="Home" description="Discover Maya Collection: personal, elegant fragrances made to become your signature scent."/>
    <section className="relative min-h-[610px] overflow-hidden bg-[#c8e4df] md:min-h-[650px]">
      <img src="/images/hero-bottle.jpg" alt="Maya Collection perfume among blue botanicals" className="absolute inset-0 h-full w-full object-cover object-center"/>
      <div className="absolute inset-0 bg-gradient-to-r from-[#dcefeb]/95 via-[#dcefeb]/78 to-transparent md:from-[#dcefeb]/95 md:via-[#dcefeb]/55 md:to-transparent"/>
      <div className="relative mx-auto flex min-h-[610px] max-w-[1300px] items-center px-6 py-16 md:min-h-[650px] md:px-12">
        <div className="fade-up max-w-[510px]"><p className="eyebrow text-[#416b68]">A fragrance house for your own kind of beautiful</p><h1 className="serif mt-6 text-[52px] leading-[1.04] text-[#17494a] md:text-[72px]">Scents that<br/>stay with you.</h1><p className="mt-6 max-w-[370px] text-sm leading-7 text-[#315e5b] md:text-base">An intimate world of considered fragrances, made to feel like you—and linger long after you leave.</p><div className="mt-8"><ButtonLink href="/collection">Discover the collection</ButtonLink></div><a href="#signature" className="mt-10 flex items-center gap-3 text-[9px] uppercase tracking-[.18em] text-[#315e5b]"><ArrowDown size={14}/> Scroll to explore</a></div>
      </div><span className="absolute bottom-7 right-8 hidden text-[9px] uppercase tracking-[.2em] text-[#315e5b] md:block">01 — Fragrance, made personal</span>
    </section>
    <section id="signature" className="mx-auto max-w-[1300px] px-6 py-20 md:px-12 md:py-28">
      <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="eyebrow text-[#6c8984]">The Maya edit · 01—06</p><h2 className="serif mt-3 text-4xl md:text-5xl">Find your signature.</h2><p className="mt-3 text-sm text-[#557472]">Six moods. One that feels unmistakably yours.</p></div><ButtonLink href="/collection" light>View all fragrances</ButtonLink></div>
       <ProductRail products={products.slice(0,5)} id="home-fragrance-rail"/>
    </section>
    <section className="grid bg-[#dcece7] md:min-h-[450px] md:grid-cols-2">
      <div className="image-wash min-h-[320px] md:min-h-full"><img src="/images/story-bottle.jpg" alt="Amber perfume oil surrounded by jasmine and botanicals" className="h-full w-full object-cover"/></div>
      <div className="flex items-center px-8 py-16 md:px-[12%] md:py-20"><div className="max-w-[470px]"><p className="eyebrow text-[#6c8984]">Our point of view</p><h2 className="serif mt-4 text-4xl leading-tight md:text-5xl">The art of feeling like yourself.</h2><p className="mt-5 text-sm leading-7 text-[#426663]">We believe a fragrance is more than a scent. It is a quiet expression of who you are: the memory you carry, the mood you choose, the presence you leave behind.</p><p className="mt-3 text-sm leading-7 text-[#426663]">Maya Collection brings together thoughtful compositions with a simple purpose—to make the everyday feel a little more yours.</p><div className="mt-8"><ButtonLink href="/about" light>Meet Maya Collection</ButtonLink></div></div></div>
    </section>
    <section className="mx-auto max-w-[1300px] px-6 py-20 md:px-12 md:py-28"><div className="text-center"><p className="eyebrow text-[#6c8984]">Made to mean something</p><h2 className="serif mt-3 text-4xl md:text-5xl">A considered kind of luxury.</h2></div><div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">{[{n:'01',title:'Thoughtful ingredients',text:'Each note has a place in the composition—chosen for character, balance and the way it unfolds.'},{n:'02',title:'Wear it your way',text:'From close-to-skin softness to a memorable trail, find the presence that feels right for you.'},{n:'03',title:'A sensory ritual',text:'Beautifully considered from first spray to final note, each scent invites a moment of pause.'},{n:'04',title:'Kind by design',text:'We believe care belongs in every detail, from the way we create to the way we connect.'}].map((item)=><div key={item.n} className="border-t border-[#17494a]/20 pt-5"><span className="serif text-3xl text-[#88a9a3]">{item.n}</span><h3 className="serif mt-5 text-xl">{item.title}</h3><p className="mt-3 text-sm leading-6 text-[#5c7774]">{item.text}</p></div>)}</div></section>
    <section className="relative overflow-hidden bg-[#e4f0ec] px-6 py-20 text-center md:py-24"><div className="pointer-events-none absolute -left-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full border border-[#a9c9c2]/40"/><div className="pointer-events-none absolute -right-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full border border-[#a9c9c2]/40"/><p className="eyebrow text-[#6c8984]">A note from us</p><h2 className="serif mx-auto mt-4 max-w-[650px] text-4xl leading-tight md:text-5xl">“The best fragrance is the one that feels like it was always yours.”</h2><p className="mt-5 text-[10px] uppercase tracking-[.17em] text-[#66817d]">Maya Collection</p></section>
  </>;
}

function Collection() {
  const [filter, setFilter] = useState('All scents');
  const filters = ['All scents', 'Floral', 'Woody', 'Fresh', 'Soft'];
  const filtered = useMemo(() => filter === 'All scents' ? products : products.filter((p) => p.family.toLowerCase().includes(filter.toLowerCase())), [filter]);
  return <><Meta title="Collection" description="Explore Maya Collection's signature fragrances, each composed to express a different mood."/>
    <PageIntro eyebrow="The Maya collection" title="A scent for every version of you." body="Meet the fragrances that make a moment yours. Follow what draws you in—light, depth, softness, surprise."/>
    <section className="mx-auto max-w-[1300px] px-6 pb-24 md:px-12"><div className="mb-9 flex flex-wrap items-center justify-between gap-4 border-b border-[#17494a]/20 pb-5"><div className="flex flex-wrap gap-2">{filters.map((item) => <button onClick={() => setFilter(item)} key={item} className={`rounded-full border px-4 py-2 text-[10px] tracking-wide transition-colors ${filter === item ? 'border-[#17494a] bg-[#17494a] text-white' : 'border-[#17494a]/25 hover:bg-[#e2efea]'}`} data-testid={`button-filter-${item.toLowerCase().replace(' ', '-')}`}>{item}</button>)}</div><p className="text-[10px] uppercase tracking-[.15em] text-[#66807d]">{filtered.length} fragrances</p></div>
       {filtered.length ? <ProductRail products={filtered} id="collection-fragrance-rail"/> : <div className="py-20 text-center"><p className="serif text-2xl">A new note is on its way.</p><p className="mt-3 text-sm text-[#66807d]">Try another fragrance family.</p></div>}
    </section>
  </>;
}
function PageIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <section className="relative overflow-hidden bg-[#dcece7] px-6 py-20 md:py-28"><div className="pointer-events-none absolute -right-20 -top-32 h-[420px] w-[420px] rounded-full border border-[#a9c9c2]/60"/><div className="pointer-events-none absolute -right-8 -top-20 h-[330px] w-[330px] rounded-full border border-[#a9c9c2]/60"/><div className="relative mx-auto max-w-[1100px]"><p className="eyebrow text-[#64817d]">{eyebrow}</p><h1 className="serif mt-5 max-w-[760px] text-[46px] leading-[1.08] md:text-[66px]">{title}</h1><p className="mt-6 max-w-[540px] text-sm leading-7 text-[#466966] md:text-base">{body}</p></div></section>;
}
function About() {
  return <><Meta title="About" description="Discover Maya Collection's approach to fragrance, personal expression and everyday rituals."/>
    <PageIntro eyebrow="A little about us" title="A fragrance should feel like a memory in the making." body="Maya Collection is an invitation to make scent your own: to follow what moves you, and find a fragrance that feels beautifully, unmistakably personal."/>
     <section className="mx-auto grid max-w-[1250px] gap-12 px-6 py-20 md:grid-cols-[.9fr_1.1fr] md:items-center md:px-12 md:py-28"><div className="image-wash min-h-[380px] bg-[#dcece7] md:min-h-[550px]"><img src="/images/story-bottle.jpg" alt="Amber perfume oil, jasmine and botanical ingredients" className="h-full w-full object-cover"/></div><div className="max-w-[520px]"><p className="eyebrow text-[#6c8984]">Our philosophy</p><h2 className="serif mt-4 text-4xl leading-tight md:text-5xl">Not just what you wear. What you remember.</h2><p className="mt-6 text-sm leading-7 text-[#557472]">Scent has a way of holding a moment. A first impression, an old place, the feeling of a day that went just right. We create for those moments—and for the many ways a person can feel like themselves.</p><p className="mt-4 text-sm leading-7 text-[#557472]">Our collection is an invitation, never a rulebook. Choose by feeling. Wear it close, wear it boldly, layer it your way. The most beautiful thing a fragrance can be is personal.</p><div className="mt-8"><ButtonLink href="/collection" light>Explore the fragrances</ButtonLink></div></div></section>
    <section className="bg-[#17494a] px-6 py-20 text-[#edf5f1] md:py-24"><div className="mx-auto grid max-w-[1200px] gap-12 md:grid-cols-[.75fr_1.25fr]"><div><p className="eyebrow text-[#b7cfca]">Our promise</p><h2 className="serif mt-4 text-4xl leading-tight md:text-5xl">Considered in every note.</h2></div><div className="grid gap-8 sm:grid-cols-2">{[['Curiosity first','We invite exploration. Follow a note that surprises you or a feeling you already know.'],['A personal signature','The best fragrance isn’t the loudest. It’s the one that feels entirely your own.'],['Care in the details','From first impression to the last trace, every stage of a scent should feel thoughtful.'],['Beauty with meaning','An object of beauty should offer more than a pretty surface. It should make you feel something.']].map(([title,text],i)=><div key={title} className="border-t border-white/25 pt-5"><span className="text-[10px] text-[#d4c49d]">0{i+1}</span><h3 className="serif mt-3 text-xl">{title}</h3><p className="mt-3 text-sm leading-6 text-[#c6d7d2]">{text}</p></div>)}</div></div></section>
    <section className="px-6 py-20 text-center md:py-28"><p className="eyebrow text-[#6c8984]">Begin with a feeling</p><h2 className="serif mx-auto mt-4 max-w-[640px] text-4xl md:text-5xl">Your next favourite scent is already waiting to be found.</h2><div className="mt-8"><ButtonLink href="/collection">Find your fragrance</ButtonLink></div></section>
  </>;
}
function RawMaterial() {
  return <><Meta title="Raw Material" description="Explore the notes and raw materials that shape Maya Collection fragrances."/>
    <PageIntro eyebrow="From nature to nuance" title="Every note has a reason to be here." body="The raw materials in a fragrance are its first language. They tell you whether to lean in, wander, remember—or begin again."/>
     <section className="mx-auto grid max-w-[1250px] gap-12 px-6 py-20 md:grid-cols-2 md:items-center md:px-12 md:py-28"><div className="order-2 max-w-[520px] md:order-1"><p className="eyebrow text-[#6c8984]">The palette of a perfume</p><h2 className="serif mt-4 text-4xl leading-tight md:text-5xl">A meeting of nature and imagination.</h2><p className="mt-6 text-sm leading-7 text-[#557472]">Perfume is composed in layers. The opening notes greet you first; the heart reveals the character; the base lingers close to the skin. Together, these shifting impressions make a fragrance feel alive.</p><p className="mt-4 text-sm leading-7 text-[#557472]">We choose notes for the way they play together—not simply for how they smell alone. A bright citrus can lift a soft floral. A warm wood can give a clean musk a sense of depth.</p><Link href="/collection" className="mt-7 inline-flex items-center gap-2 border-b border-[#17494a] pb-2 text-[10px] uppercase tracking-[.16em]" data-testid="link-material-collection">Meet the fragrances <ArrowRight size={14}/></Link></div><div className="image-wash order-1 min-h-[360px] md:order-2 md:min-h-[530px]"><img src="/images/story-bottle.jpg" alt="Amber perfume oil with jasmine and botanicals" className="h-full w-full object-cover"/></div></section>
    <section className="bg-[#e4f0ec] px-6 py-20 md:py-24"><div className="mx-auto max-w-[1200px]"><p className="eyebrow text-center text-[#6c8984]">A fragrance, in three movements</p><h2 className="serif mt-3 text-center text-4xl md:text-5xl">The life of a scent.</h2><div className="mt-14 grid gap-0 md:grid-cols-3">{[['01 · The opening','Top notes','A first impression that brightens the air: citrus, aromatic leaves, and delicate spices.'],['02 · The heart','Heart notes','The personality beneath the first hello: florals, fruits, and the unexpected harmony between them.'],['03 · The lasting note','Base notes','The warmth that stays close: woods, resins, musks and the softest trace of sweetness.']].map(([num,title,text],i)=><article key={title} className={`border-t border-[#17494a]/25 px-2 py-7 md:px-8 md:py-8 ${i<2?'md:border-r':''}`}><p className="eyebrow text-[#829f99]">{num}</p><h3 className="serif mt-5 text-2xl">{title}</h3><p className="mt-4 max-w-[290px] text-sm leading-6 text-[#587472]">{text}</p></article>)}</div></div></section>
    <section className="mx-auto max-w-[1200px] px-6 py-20 md:px-12 md:py-28"><div className="grid gap-8 md:grid-cols-[.8fr_1.2fr]"><div><p className="eyebrow text-[#6c8984]">A few familiar notes</p><h2 className="serif mt-4 text-4xl leading-tight">A small field guide.</h2></div><div className="divide-y divide-[#17494a]/20">{[['Bergamot','Bright, green citrus with a polished, almost floral edge.'],['Jasmine','Luminous white petals, rich with a soft, velvety warmth.'],['Cedarwood','Dry, clean wood with a quiet sense of structure.'],['Musk','A soft, close-to-skin finish that gives a fragrance its lasting embrace.']].map(([name,desc])=><details key={name} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between"><span className="serif text-xl">{name}</span><ChevronDown size={16} className="transition-transform group-open:rotate-180"/></summary><p className="mt-3 max-w-[520px] text-sm leading-6 text-[#5b7774]">{desc}</p></details>)}</div></div></section>
  </>;
}
function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!String(data.get('email')).includes('@')) {
      setError('Please add a valid email so we can reply.');
      return;
    }
    setError('');
    setSubmitted(true);
    form.reset();
  };
  return <>
    <Meta title="Contact" description="Get in touch with Maya Collection for fragrance questions and personal recommendations."/>
    <PageIntro eyebrow="We would love to hear from you" title="Let’s find your next favourite." body="A question about a scent, a note you can’t stop thinking about, or simply looking for a little guidance? We’re here to help."/>
    <section className="mx-auto grid max-w-[1200px] gap-16 px-6 py-20 md:grid-cols-[.8fr_1.2fr] md:px-12 md:py-28">
      <div>
        <p className="eyebrow text-[#6c8984]">A personal note</p>
        <h2 className="serif mt-4 text-4xl">Start a conversation.</h2>
        <p className="mt-5 max-w-[380px] text-sm leading-7 text-[#557472]">Tell us what you love in a fragrance, what you’re curious about, or what you’d like to know. We’ll be glad to help you find your way.</p>
        <div className="mt-10 space-y-7">
          <div className="border-t border-[#17494a]/20 pt-5">
            <p className="eyebrow text-[#78948f]">Call or message</p>
            <a href={storePhoneLink} className="serif mt-2 inline-block text-xl hover:opacity-70" data-testid="link-contact-phone">{storePhone}</a>
            <a href={whatsappLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-[10px] uppercase tracking-widest" data-testid="link-contact-whatsapp"><MessageCircle size={14}/> Message on WhatsApp</a>
          </div>
          <div className="border-t border-[#17494a]/20 pt-5">
            <p className="eyebrow text-[#78948f]">Store address</p>
            <p className="serif mt-2 text-xl">Maya Collection perfumes</p>
            <p className="mt-2 max-w-[350px] text-sm leading-6 text-[#66807d]">{storeAddress}</p>
            <a href={storeMapLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-[10px] uppercase tracking-widest" data-testid="link-contact-map">Open address in Maps <ArrowRight size={13}/></a>
          </div>
        </div>
      </div>
      <div className="bg-[#e4f0ec] p-6 md:p-10">
        <p className="eyebrow text-[#6c8984]">Write to us</p>
        <h2 className="serif mt-3 text-3xl">What’s on your mind?</h2>
        {submitted ? (
          <div className="mt-8 border border-[#9fbeb7] bg-[#edf6f1] p-6" role="status">
            <Check size={20}/>
            <p className="serif mt-4 text-2xl">Your note is ready.</p>
            <p className="mt-2 text-sm leading-6 text-[#557472]">Thanks for reaching out. This demo form does not send messages yet—please call us directly at <a href={storePhoneLink} className="underline">{storePhone}</a>.</p>
            <button onClick={() => setSubmitted(false)} className="mt-5 text-[10px] uppercase tracking-widest underline" data-testid="button-send-another">Write another note</button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-7 grid gap-5">
            <label className="grid gap-2 text-[10px] uppercase tracking-[.14em]">Your name<input required name="name" placeholder="How shall we call you?" className="border-b border-[#17494a]/30 bg-transparent py-3 text-sm normal-case tracking-normal outline-none placeholder:text-[#8da7a2] focus:border-[#17494a]" data-testid="input-name"/></label>
            <label className="grid gap-2 text-[10px] uppercase tracking-[.14em]">Email address<input required type="email" name="email" placeholder="you@example.com" className="border-b border-[#17494a]/30 bg-transparent py-3 text-sm normal-case tracking-normal outline-none placeholder:text-[#8da7a2] focus:border-[#17494a]" data-testid="input-contact-email"/></label>
            <label className="grid gap-2 text-[10px] uppercase tracking-[.14em]">I’m curious about<select name="topic" className="border-b border-[#17494a]/30 bg-transparent py-3 text-sm normal-case tracking-normal outline-none focus:border-[#17494a]" data-testid="select-topic"><option>Finding my signature scent</option><option>A particular fragrance</option><option>Ingredients and notes</option><option>Something else</option></select></label>
            <label className="grid gap-2 text-[10px] uppercase tracking-[.14em]">Your message<textarea required name="message" rows={4} placeholder="A little more about what you're looking for..." className="resize-y border-b border-[#17494a]/30 bg-transparent py-3 text-sm normal-case tracking-normal outline-none placeholder:text-[#8da7a2] focus:border-[#17494a]" data-testid="input-message"/></label>
            {error && <p className="text-xs text-[#a94f43]" role="alert">{error}</p>}
            <button className="mt-2 flex items-center justify-center gap-3 bg-[#17494a] px-6 py-4 text-[10px] uppercase tracking-[.17em] text-white transition-colors hover:bg-[#246668]" data-testid="button-send-message">Send your note <ArrowRight size={14}/></button>
            <p className="text-[10px] leading-5 text-[#66807d]">This form is a front-end preview and does not send or store messages.</p>
          </form>
        )}
      </div>
    </section>
  </>;
}
function Router() {
  return <RoutedErrorBoundary><AppShell><Switch><Route path="/" component={Home}/><Route path="/about" component={About}/><Route path="/collection" component={Collection}/><Route path="/raw-material" component={RawMaterial}/><Route path="/contact" component={Contact}/><Route component={NotFound}/></Switch></AppShell></RoutedErrorBoundary>;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router/></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>;
}
export default App;
