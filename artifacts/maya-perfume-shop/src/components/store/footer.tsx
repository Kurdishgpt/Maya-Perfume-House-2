import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { ChevronDown, MapPin, Phone, Store } from 'lucide-react';
import { FaInstagram, FaWhatsapp } from 'react-icons/fa';
import { Wordmark } from '@/components/store/brand';
import { useStore } from '@/lib/store-context';
import { instagramLink, languages, storeAddress, storeMapLink, storePhone, storePhoneHref, whatsappLink } from '@/lib/store';

function Section({ title, id, children }: { title: string; id: string; children: ReactNode }) {
  return <details className="mc-acc" data-testid={`footer-section-${id}`}>
    <summary><span>{title}</span><ChevronDown size={18}/></summary>
    <div className="mc-acc-body">{children}</div>
  </details>;
}

export function Footer() {
  const { t, language, setLanguage } = useStore();
  return <footer className="mc-footer">
    <div className="mc-footer-inner">
      <div className="mc-footer-brand"><Wordmark/></div>
      <div className="mc-footer-sections">
        <Section title={t('language')} id="language">
          <div className="mc-footer-langs">{languages.map((l) => <button key={l.code} onClick={() => setLanguage(l.code)} className={l.code === language ? 'is-active' : ''} aria-pressed={l.code === language} data-testid={`footer-language-${l.code}`}>{l.label}</button>)}</div>
        </Section>
        <Section title={t('pages')} id="pages">
          <Link href="/">{t('home')}</Link><Link href="/collection">{t('collection')}</Link><Link href="/about">{t('about')}</Link>
          <Link href="/contact">{t('contact')}</Link><Link href="/privacy">{t('privacy')}</Link><Link href="/terms">{t('terms')}</Link>
        </Section>
        <Section title={t('support')} id="support">
          <Link href="/faq">{t('faq')}</Link><Link href="/shipping">{t('shipping')}</Link><Link href="/returns">{t('returns')}</Link>
          <a href={whatsappLink} target="_blank" rel="noreferrer">{t('contactSupport')}</a>
        </Section>
        <Section title={t('contactInfo')} id="contact">
          <a href={storePhoneHref} className="mc-footer-contact" data-testid="link-footer-phone"><Phone size={16}/><span dir="ltr">{storePhone}</span></a>
          <p className="mc-footer-contact"><Store size={16}/><span>{t('storeName')}</span></p>
          <a href={storeMapLink} target="_blank" rel="noreferrer" className="mc-footer-contact" data-testid="link-footer-address"><MapPin size={16}/><span dir="ltr">{storeAddress}</span></a>
        </Section>
      </div>
      <div className="mc-footer-bottom">
        <div className="mc-footer-follow"><span>{t('followUs')}</span>
          <a href={whatsappLink} target="_blank" rel="noreferrer" aria-label="WhatsApp" data-testid="footer-whatsapp"><FaWhatsapp/></a>
          <a href={instagramLink} target="_blank" rel="noreferrer" aria-label="Instagram" data-testid="footer-instagram"><FaInstagram/></a>
        </div>
        <p>{t('rights')}</p>
        <Link href="/admin" className="mc-admin-link" data-testid="link-admin">{t('admin')}</Link>
      </div>
    </div>
  </footer>;
}
