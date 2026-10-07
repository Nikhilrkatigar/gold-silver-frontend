import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useLang, LANGUAGES } from '../i18n';
import { GUIDES, startGuide } from '../guides';
import { overlayMotion, panelMotion } from './ConfirmDialog';

/**
 * Guide runner. Shows the first-visit language picker + app tour, and any task
 * guide started from Help. The current guide/step lives in sessionStorage, so a
 * guide carries on when a step opens another page (every page mounts Layout).
 */
const TOUR_KEY = 'gs_tour';
const doneKey = (id) => `gs_onboarded_${id}`;
const PAD = 6;
const FIND_TIMEOUT_MS = 4000;

const store = {
  get: (k, s = localStorage) => { try { return s.getItem(k); } catch { return null; } },
  set: (k, v, s = localStorage) => { try { s.setItem(k, v); } catch { /* private mode */ } },
  del: (k, s = localStorage) => { try { s.removeItem(k); } catch { /* private mode */ } },
};
const readTour = () => {
  try { return JSON.parse(store.get(TOUR_KEY, sessionStorage)); } catch { return null; }
};
const isMobile = () => window.matchMedia('(max-width: 1023.98px)').matches;

const buildSteps = (id, navItems, t, user) => {
  if (id === 'app') {
    return [
      { kind: 'intro', title: t('tour.welcomeTitle', { name: user?.shopName || '' }), body: t('tour.welcomeBody') },
      ...navItems.map((n) => ({
        target: n.path, nav: true, click: true,
        title: t(`nav.${n.path}`), body: t(`help.${n.path}`), hint: t('tour.clickHint')
      })),
      { kind: 'done', title: t('tour.doneTitle'), body: t('tour.doneBody'), cta: { label: t('tour.firstBill'), to: '/billing' } },
    ];
  }
  const guide = GUIDES.find((g) => g.id === id && g.steps);
  if (!guide) return null;
  return [
    ...guide.steps.map((s) => ({
      ...s, click: s.press,
      title: t(`g.${s.key}.t`), body: t(`g.${s.key}.b`), hint: s.press ? t('tour.clickHint') : undefined
    })),
    { kind: 'done', title: t('guide.doneTitle'), body: t('guide.doneBody') },
  ];
};

export default function Onboarding({ navItems, setSidebarOpen }) {
  const { user, updateUserSettings } = useAuth();
  const { t, setLang, lang, hasChosen } = useLang();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [askLang, setAskLang] = useState(false);
  const [tour, setTour] = useState(readTour); // { id, step } | null
  const [target, setTarget] = useState({ state: 'none', rect: null }); // none | searching | found | missing
  const nextRef = useRef(null);
  const elRef = useRef(null);

  // Memoised: effects below key off `step`, so it must keep its identity between renders
  const navKey = navItems.map((n) => n.path).join();
  const steps = useMemo(
    () => (tour ? buildSteps(tour.id, navItems, t, user) : null),
    [tour?.id, navKey, t, user?.shopName] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const step = steps?.[tour.step];

  const save = useCallback((next) => {
    if (next) store.set(TOUR_KEY, JSON.stringify(next), sessionStorage);
    else store.del(TOUR_KEY, sessionStorage);
    setTour(next);
  }, []);

  const goTo = useCallback((n) => setTour((cur) => {
    const next = cur && { ...cur, step: n };
    if (next) store.set(TOUR_KEY, JSON.stringify(next), sessionStorage);
    return next;
  }), []);

  const finish = useCallback(() => {
    if (tour?.id === 'app' && user) {
      store.set(doneKey(user.id), '1');
      updateUserSettings({ onboarded: true }).catch(() => {});
    }
    save(null);
    if (isMobile()) setSidebarOpen(false);
  }, [tour, user, updateUserSettings, save, setSidebarOpen]);

  // First visit: language picker (if needed), then the app tour
  useEffect(() => {
    if (readTour()) return;
    const isNew = user && !user.onboarded && !store.get(doneKey(user.id));
    if (!isNew) return;
    if (hasChosen) save({ id: 'app', step: 0 });
    else setAskLang(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Help menu / Account start guides through this event
  useEffect(() => {
    const onStart = (e) => save({ id: e.detail, step: 0 });
    window.addEventListener('gs:guide', onStart);
    return () => window.removeEventListener('gs:guide', onStart);
  }, [save]);

  // Unknown or finished guide → clear it
  useEffect(() => {
    if (tour && (!steps || !step)) save(null);
  }, [tour, steps, step, save]);

  // Open the step's page; the guide resumes there from sessionStorage
  useEffect(() => {
    if (step?.path && pathname !== step.path) navigate(step.path);
  }, [step, pathname, navigate]);

  // Drawer: open for menu steps on phones, closed for page steps
  useEffect(() => {
    if (tour && isMobile()) setSidebarOpen(Boolean(step?.nav));
  }, [tour, step, setSidebarOpen]);

  // Find the target (pages load data first), spotlight it, follow scroll/resize
  useLayoutEffect(() => {
    elRef.current = null;
    if (!step?.target) { setTarget({ state: 'none', rect: null }); return undefined; }
    const wrongPage = (step.path && pathname !== step.path)
      || (step.pathPrefix && !pathname.startsWith(step.pathPrefix));
    if (wrongPage) { setTarget({ state: step.path ? 'searching' : 'missing', rect: null }); return undefined; }

    setTarget({ state: 'searching', rect: null });
    const selector = step.nav ? `.sidebar [data-tour="${step.target}"]` : `[data-tour="${step.target}"]`;
    let el = null;
    let cleanup = () => {};
    const started = Date.now();

    const measure = () => el && setTarget({ state: 'found', rect: el.getBoundingClientRect() });
    const attach = () => {
      el.scrollIntoView({ block: step.nav ? 'nearest' : 'center', behavior: 'smooth' });
      elRef.current = el;
      measure();
      const late = setTimeout(measure, 300);
      const onClick = () => goTo(tour.step + 1);
      if (step.click) el.addEventListener('click', onClick);
      window.addEventListener('resize', measure);
      window.addEventListener('scroll', measure, true);
      cleanup = () => {
        clearTimeout(late);
        el.removeEventListener('click', onClick);
        window.removeEventListener('resize', measure);
        window.removeEventListener('scroll', measure, true);
      };
    };
    const poll = setInterval(() => {
      el = document.querySelector(selector);
      if (el) { clearInterval(poll); attach(); }
      else if (Date.now() - started > FIND_TIMEOUT_MS) { clearInterval(poll); setTarget({ state: 'missing', rect: null }); }
    }, 120);
    return () => { clearInterval(poll); cleanup(); };
  }, [step, tour?.step, pathname, goTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback(() => {
    // "press" steps click the real button for the user (it navigates and advances)
    if (step?.press && elRef.current) elRef.current.click();
    else goTo(tour.step + 1);
  }, [step, tour, goTo]);

  useEffect(() => {
    if (!tour) return undefined;
    nextRef.current?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight' && steps && tour.step < steps.length - 1) next();
      if (e.key === 'ArrowLeft' && tour.step > 0) goTo(tour.step - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tour, steps, next, goTo, finish]);

  if (askLang) {
    return (
      <motion.div className="modal-overlay tour-overlay" style={{ animation: 'none' }} {...overlayMotion}>
        <motion.div className="modal" role="dialog" aria-modal="true" aria-labelledby="lang-title"
          style={{ maxWidth: 420, animation: 'none' }} {...panelMotion}>
          <div className="modal-body" style={{ textAlign: 'center' }}>
            <img src="/favicon.svg" alt="" width="48" height="48" style={{ borderRadius: 12, margin: '0 auto 0.75rem', display: 'block' }} />
            <h2 id="lang-title" style={{ fontSize: '1.25rem' }}>{t('lang.title')}</h2>
            <p className="text-muted" style={{ fontSize: '0.875rem', margin: '0.25rem 0 1.25rem' }}>
              ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ · भाषा चुनें
            </p>
            <div className="lang-options">
              {LANGUAGES.map((l) => (
                <button key={l.code} type="button" className={`lang-option${lang === l.code ? ' active' : ''}`}
                  onClick={() => { setLang(l.code); setAskLang(false); save({ id: 'app', step: 0 }); }}>
                  <span className="lang-native">{l.native}</span>
                  {l.native !== l.name && <span className="lang-name">{l.name}</span>}
                </button>
              ))}
            </div>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '1rem' }}>{t('lang.sub')}</p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (!tour || !step) return null;

  const total = steps.length;
  const isIntro = step.kind === 'intro';
  const isDone = step.kind === 'done';
  const { rect } = target;
  const waiting = target.state === 'searching';

  // Blur everything except a hole around the target
  const hole = rect && { x1: rect.left - PAD, y1: rect.top - PAD, x2: rect.right + PAD, y2: rect.bottom + PAD };
  const clipPath = hole
    ? `polygon(0 0, 0 100%, ${hole.x1}px 100%, ${hole.x1}px ${hole.y1}px, ${hole.x2}px ${hole.y1}px, ${hole.x2}px ${hole.y2}px, ${hole.x1}px ${hole.y2}px, ${hole.x1}px 100%, 100% 100%, 100% 0)`
    : undefined;

  // Card: right of the target, else below, else above, else floating at the bottom
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(340, vw - 24);
  const clampX = (x) => Math.max(12, Math.min(x, vw - cardW - 12));
  let cardStyle = { width: cardW };
  if (hole) {
    if (hole.x2 + 12 + cardW <= vw - 12 && hole.y2 - hole.y1 < vh * 0.6) {
      cardStyle = { ...cardStyle, left: hole.x2 + 12, top: Math.max(12, Math.min(hole.y1 - 8, vh - 280)) };
    } else if (vh - hole.y2 > 250) {
      cardStyle = { ...cardStyle, left: clampX(hole.x1), top: hole.y2 + 10 };
    } else if (hole.y1 > 250) {
      cardStyle = { ...cardStyle, left: clampX(hole.x1), bottom: vh - hole.y1 + 10 };
    } else {
      cardStyle = { ...cardStyle, left: (vw - cardW) / 2, bottom: isMobile() ? 76 : 16 };
    }
  } else {
    cardStyle = { ...cardStyle, left: (vw - cardW) / 2, top: Math.max(12, vh / 2 - 140) };
  }

  return (
    <>
      <motion.div className="tour-overlay tour-blur" style={{ clipPath }} {...overlayMotion} />
      {hole && (
        <motion.div
          className="tour-ring"
          aria-hidden="true"
          initial={false}
          animate={{ left: hole.x1, top: hole.y1, width: hole.x2 - hole.x1, height: hole.y2 - hole.y1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        >
          <span key={tour.step} className="tour-pulse" />
        </motion.div>
      )}
      <AnimatePresence mode="wait">
        {!waiting && (
          <motion.div
            key={`${tour.id}-${tour.step}`}
            className="tour-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
            style={cardStyle}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="tour-step">{t('tour.step', { n: tour.step + 1, total })}</div>
            <h3 id="tour-title" className="tour-title">{step.title}</h3>
            <p className="tour-body">{step.body}</p>
            {target.state === 'found' && step.hint && <p className="tour-hint">{step.hint}</p>}
            {target.state === 'missing' && <p className="tour-hint">{t('guide.noTarget')}</p>}

            <div className="tour-actions">
              {!isDone && <button type="button" className="btn btn-sm tour-skip" onClick={finish}>{t('tour.skip')}</button>}
              <div style={{ flex: 1 }} />
              {tour.step > 0 && !isDone && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => goTo(tour.step - 1)}>{t('tour.back')}</button>
              )}
              {isDone ? (
                <>
                  {step.cta && <button type="button" className="btn btn-secondary btn-sm" onClick={finish}>{t('tour.close')}</button>}
                  <button type="button" ref={nextRef} className="btn btn-primary btn-sm"
                    onClick={() => { finish(); if (step.cta) navigate(step.cta.to); }}>
                    {step.cta ? step.cta.label : t('guide.gotIt')}
                  </button>
                </>
              ) : (
                <button type="button" ref={nextRef} className="btn btn-primary btn-sm" onClick={next}>
                  {isIntro ? t('tour.start') : t('tour.next')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** "?" Help button + list of guides. */
export function HelpMenu() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button type="button" className="btn btn-secondary btn-sm help-btn" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span aria-hidden="true" className="help-q">?</span>
        <span className="help-label">{t('help.button')}</span>
      </button>
      {/* Portal: the topbar's backdrop-filter would otherwise trap this fixed overlay inside it */}
      {createPortal(<AnimatePresence>
        {open && (
          <motion.div className="modal-overlay" onClick={() => setOpen(false)} style={{ zIndex: 1050, animation: 'none' }} {...overlayMotion}>
            <motion.div className="modal" role="dialog" aria-modal="true" aria-labelledby="help-title"
              onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, animation: 'none' }} {...panelMotion}>
              <div className="modal-header">
                <h3 id="help-title" className="modal-title">{t('guide.title')}</h3>
                <button type="button" className="btn btn-icon" onClick={() => setOpen(false)} aria-label={t('tour.close')}>
                  <FiX size={20} />
                </button>
              </div>
              <div className="modal-body" style={{ padding: '0.5rem' }}>
                {GUIDES.map(({ id, icon: Icon }) => (
                  <button key={id} type="button" className="guide-item" onClick={() => { setOpen(false); startGuide(id); }}>
                    <span className="guide-icon"><Icon size={18} aria-hidden="true" /></span>
                    <span>
                      <span className="guide-name">{t(`guide.${id}`)}</span>
                      <span className="guide-desc">{t(`guide.${id}.d`)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </>
  );
}
