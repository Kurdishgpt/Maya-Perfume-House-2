import { Link } from 'wouter';
import { useStore } from '@/lib/store-context';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function WomanIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path {...s} d="M17 9l2.5 3 2.5-3.5 2.5 3.5 2.5-3"/><path {...s} d="M27 14c-5-2-10 1-10.5 7-.4 4 1.5 6.5 1 10-.4 3-2.5 5.5-4.5 7"/><path {...s} d="M27 14c3 1.5 4.5 4.5 4 8l1.8 3.2-1.8.8v3c0 1.5-1 2.3-2.8 2l-1.2 4 2 4"/><path {...s} d="M21 22c-1 4-.2 9 1.8 13"/></svg>;
}
function ManIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path {...s} d="M16.5 19c-.6-6 3.5-10 9-10 5 0 7.8 3.4 7.5 8.5"/><path {...s} d="M16.5 19c0 6 3.5 11 8 11s8-4.5 8.5-11"/><path {...s} d="M17.5 16c4 .8 9-1 11.5-4"/><path {...s} d="M12 41c1-6 5-9.5 9-10.5L24.5 36l3.5-5.5c4 1 8 4.5 9 10.5"/><path {...s} d="M24.5 36v5"/></svg>;
}
function PerfectIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><circle {...s} cx="19" cy="22" r="8"/><path {...s} d="M19 30v10M15 36h8"/><circle {...s} cx="29" cy="22" r="8"/><path {...s} d="M34.6 16.4 40 11M35 11h5v5"/></svg>;
}
function RawIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path {...s} d="M30 10h6M31 10v7l5 6v13a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V23l5-6"/><path {...s} d="M26 29h10"/><path {...s} d="M10 39c0-9 4-15 12-17-1 8-5 14-12 17Z"/><path {...s} d="M10 39c3-5 6-9 10-13"/><path {...s} d="m14 18 3-7 3 7-3 2-3-2Z"/></svg>;
}

const cats = [
  { key: 'women', href: '/collection?cat=women', Icon: WomanIcon },
  { key: 'men', href: '/collection?cat=men', Icon: ManIcon },
  { key: 'perfect', href: '/collection?cat=perfect', Icon: PerfectIcon },
  { key: 'rawMaterials', href: '/raw-material', Icon: RawIcon },
] as const;

export function CategoryGrid() {
  const { t } = useStore();
  return <div className="mc-cats">
    {cats.map(({ key, href, Icon }, i) => <Link key={key} href={href} className="mc-cat" style={{ animationDelay: `${120 + i * 60}ms` }} data-testid={`link-category-${key}`}>
      <span className="mc-cat-ring"><Icon/></span>
      <span className="mc-cat-label">{t(key)}</span>
    </Link>)}
  </div>;
}
