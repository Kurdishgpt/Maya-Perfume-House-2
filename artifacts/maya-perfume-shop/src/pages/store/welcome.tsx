import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { Crown } from '@/components/store/brand';
import { useStore } from '@/lib/store-context';

export default function Welcome() {
  const { t } = useStore();
  const [, navigate] = useLocation();
  const [leaving, setLeaving] = useState(false);
  const start = () => {
    localStorage.setItem('maya-welcomed', '1');
    setLeaving(true);
    window.setTimeout(() => navigate('/'), 420);
  };
  return <section className={`mc-welcome ${leaving ? 'is-leaving' : ''}`} data-testid="page-welcome">
    <img src="/images/welcome-signature.jpg" alt="" className="mc-welcome-bg" fetchPriority="high"/>
    <div className="mc-welcome-shade"/>
    <div className="mc-welcome-top">
      <div className="mc-welcome-brand" dir="ltr"><span/><Crown className="mc-welcome-crown"/><strong>MAYA COLLECTION</strong><span/></div>
      <h1><span>{t('welcomeTitle1')}</span><em>{t('welcomeTitle2')}</em></h1>
      <p>{t('welcomeBody')}</p>
    </div>
    <div className="mc-welcome-cta">
      <button onClick={start} data-testid="button-get-started"><span>{t('getStarted')}</span><ArrowRight className="mc-flip"/></button>
    </div>
  </section>;
}
