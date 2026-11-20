import React, { useState, lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProductBento } from './components/ProductBento';
import { MaterialFab } from './components/MaterialFab';
import { MaterialSnackbar, SnackbarMessage } from './components/MaterialSnackbar';
import { LoadingScreen } from './components/LoadingScreen';
import { CookieConsent } from './components/CookieConsent';
import { useIOReveal } from './hooks/useIOReveal';
import { useSeo } from './hooks/useSeo';
import { buildClientUrl, parseRouteFromLocation } from './seo/seoConfig';

// Lazy-loaded below-the-fold home sections
const InteractiveCalculator = lazy(() =>
  import('./components/InteractiveCalculator').then((m) => ({ default: m.InteractiveCalculator }))
);
const TrustMarquee = lazy(() =>
  import('./components/TrustMarquee').then((m) => ({ default: m.TrustMarquee }))
);
const MoveMoneySection = lazy(() =>
  import('./components/TuyoShowcaseSections').then((m) => ({ default: m.MoveMoneySection }))
);
const TestimonialsSliderSection = lazy(() =>
  import('./components/TuyoShowcaseSections').then((m) => ({ default: m.TestimonialsSliderSection }))
);
const LiveTickingYieldSection = lazy(() =>
  import('./components/TuyoShowcaseSections').then((m) => ({ default: m.LiveTickingYieldSection }))
);
const LeadershipSection = lazy(() =>
  import('./components/LeadershipSection').then((m) => ({ default: m.LeadershipSection }))
);
const FAQSection = lazy(() =>
  import('./components/FAQSection').then((m) => ({ default: m.FAQSection }))
);
const ContactSection = lazy(() =>
  import('./components/ContactSection').then((m) => ({ default: m.ContactSection }))
);
const Footer = lazy(() =>
  import('./components/Footer').then((m) => ({ default: m.Footer }))
);

// Lazy-loaded secondary pages & internal portals (excluded from initial mobile bundle)
const AboutUsPage = lazy(() =>
  import('./components/AboutUsPage').then((m) => ({ default: m.AboutUsPage }))
);
const ProductDetailPage = lazy(() =>
  import('./components/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage }))
);
const IppisLoansPage = lazy(() =>
  import('./components/IppisLoansPage').then((m) => ({ default: m.IppisLoansPage }))
);
const BlogPage = lazy(() =>
  import('./components/BlogPage').then((m) => ({ default: m.BlogPage }))
);
const CareersPage = lazy(() =>
  import('./components/CareersPage').then((m) => ({ default: m.CareersPage }))
);
const GalleryPage = lazy(() =>
  import('./components/GalleryPage').then((m) => ({ default: m.GalleryPage }))
);
const CmsPortal = lazy(() =>
  import('./components/CmsPortal').then((m) => ({ default: m.CmsPortal }))
);
const HrmsExecutivePortal = lazy(() =>
  import('./components/HrmsExecutivePortal').then((m) => ({ default: m.HrmsExecutivePortal }))
);
const ExpensePortal = lazy(() =>
  import('./components/ExpensePortal').then((m) => ({ default: m.ExpensePortal }))
);

// Lazy-loaded interactive modals (fetched only when opened)
const ApplyModal = lazy(() =>
  import('./components/ApplyModal').then((m) => ({ default: m.ApplyModal }))
);
const InvestModal = lazy(() =>
  import('./components/InvestModal').then((m) => ({ default: m.InvestModal }))
);

type ActiveView =
  | 'home'
  | 'about'
  | 'blog'
  | 'careers'
  | 'gallery'
  | 'product-detail'
  | 'ippis-loans'
  | 'cms'
  | 'hrms'
  | 'staffportal'
  | 'expense';

export default function App() {
  const initialRoute = React.useMemo(() => parseRouteFromLocation(), []);
  const [currentView, setCurrentView] = useState<ActiveView>(initialRoute.view as ActiveView);
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialRoute.view === 'product-detail' && initialRoute.param ? initialRoute.param : 'suremoney-loan'
  );
  const [selectedBlogSlug, setSelectedBlogSlug] = useState<string | undefined>(
    initialRoute.view === 'blog' ? initialRoute.param : undefined
  );

  // Fast-track apply modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaultProduct, setModalDefaultProduct] = useState<string | undefined>(undefined);
  const [modalDefaultAmount, setModalDefaultAmount] = useState<number | undefined>(undefined);
  const [modalDefaultTenure, setModalDefaultTenure] = useState<number | undefined>(undefined);

  // High-Yield Investment modal state
  const [investModalOpen, setInvestModalOpen] = useState(false);

  // Material Design 3 Snackbar notification state
  const [snackbarMessage, setSnackbarMessage] = useState<SnackbarMessage | null>(null);

  const showSnackbar = (
    text: string,
    type: 'success' | 'info' = 'success',
    actionLabel?: string,
    onAction?: () => void
  ) => {
    setSnackbarMessage({
      id: String(Date.now()),
      text,
      type,
      actionLabel,
      onAction,
    });
  };

  // Sync per-route document title, canonical URL, OpenGraph/Twitter tags, and Schema.org JSON-LD
  useSeo(
    currentView,
    currentView === 'product-detail'
      ? selectedProductId
      : currentView === 'blog'
        ? selectedBlogSlug
        : undefined
  );

  // Trigger intersection observer reveal animation on viewport entry
  useIOReveal('.io-reveal');

  const pushCleanUrl = (routePath: string) => {
    try {
      const target = buildClientUrl(routePath);
      if (window.location.pathname !== target || window.location.hash) {
        window.history.pushState({}, '', target);
      }
    } catch {
      // Ignore history API errors in restricted sandboxed contexts
    }
  };

  // Support browser Back/Forward (popstate) and direct hash navigation (#cms, #hrms, #staffportal, #expense)
  React.useEffect(() => {
    const syncFromLocation = () => {
      const parsed = parseRouteFromLocation();
      setCurrentView(parsed.view as ActiveView);
      if (parsed.view === 'product-detail' && parsed.param) {
        setSelectedProductId(parsed.param);
      }
      if (parsed.view === 'blog') {
        setSelectedBlogSlug(parsed.param);
      } else {
        setSelectedBlogSlug(undefined);
      }
    };
    window.addEventListener('popstate', syncFromLocation);
    window.addEventListener('hashchange', syncFromLocation);
    return () => {
      window.removeEventListener('popstate', syncFromLocation);
      window.removeEventListener('hashchange', syncFromLocation);
    };
  }, []);

  const handleOpenApply = (productName?: string, amount?: number, tenure?: number) => {
    setModalDefaultProduct(productName);
    setModalDefaultAmount(amount);
    setModalDefaultTenure(tenure);
    setModalOpen(true);
  };

  const handleNavigate = (view: string, productId?: string) => {
    if (view === 'ippis-loans') {
      setCurrentView('ippis-loans');
      pushCleanUrl('/ippis-loans-nigeria');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'product-detail') {
      const targetId = productId || 'suremoney-loan';
      setSelectedProductId(targetId);
      setCurrentView('product-detail');
      pushCleanUrl(`/loans/${targetId}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'about') {
      setCurrentView('about');
      pushCleanUrl('/about');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'blog') {
      setSelectedBlogSlug(productId);
      setCurrentView('blog');
      pushCleanUrl(productId ? `/blog/${productId}` : '/blog');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'careers') {
      setCurrentView('careers');
      pushCleanUrl('/careers');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'gallery') {
      setCurrentView('gallery');
      pushCleanUrl('/gallery');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'cms') {
      setCurrentView('cms');
      window.location.hash = '#cms';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'staffportal') {
      setCurrentView('staffportal');
      window.location.hash = '#staffportal';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'expense') {
      setCurrentView('expense');
      window.location.hash = '#expense';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'hrms') {
      setCurrentView('hrms');
      window.location.hash = '#hrms';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'about-products') {
      setCurrentView('about');
      setTimeout(() => {
        const el = document.getElementById('about-products');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
      return;
    }

    if (view === 'leadership') {
      setCurrentView('about');
      setTimeout(() => {
        const el = document.getElementById('leadership');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
      return;
    }

    if (view === 'partners') {
      setCurrentView('about');
      setTimeout(() => {
        const el = document.getElementById('partners');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
      return;
    }

    // Anchors on Home
    setCurrentView('home');
    pushCleanUrl('/');
    if (view === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Scroll to section on home page
    setTimeout(() => {
      const el = document.getElementById(view);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };

  const handleScrollToCalculator = () => {
    handleNavigate('calculator');
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#00e575] selection:text-black font-body transition-colors duration-300">
      {/* Brand Animated Logo Mark Loading Splash Screen */}
      <LoadingScreen />

      {/* 1. Menu (Navbar) with dynamic routing */}
      <Navbar
        onOpenApply={handleOpenApply}
        onNavigate={handleNavigate}
        currentView={currentView}
      />

      <main>
        <Suspense fallback={<div className="min-h-[60vh] bg-black" />}>
          {currentView === 'about' && (
            <AboutUsPage onOpenApply={handleOpenApply} onNavigate={handleNavigate} />
          )}

          {currentView === 'ippis-loans' && (
            <IppisLoansPage onOpenApply={handleOpenApply} onNavigate={handleNavigate} />
          )}

          {currentView === 'product-detail' && (
            <ProductDetailPage
              productId={selectedProductId}
              onOpenApply={handleOpenApply}
              onNavigate={handleNavigate}
              onShowSnackbar={showSnackbar}
            />
          )}

          {currentView === 'blog' && (
            <BlogPage
              onNavigate={handleNavigate}
              onOpenApply={handleOpenApply}
              initialSlug={selectedBlogSlug}
              onSelectSlug={(slug) => {
                setSelectedBlogSlug(slug);
                pushCleanUrl(slug ? `/blog/${slug}` : '/blog');
              }}
            />
          )}

          {currentView === 'careers' && (
            <CareersPage onNavigate={handleNavigate} onOpenApply={handleOpenApply} />
          )}

          {currentView === 'gallery' && (
            <GalleryPage onNavigate={handleNavigate} onOpenApply={handleOpenApply} />
          )}

          {currentView === 'cms' && (
            <CmsPortal onNavigate={handleNavigate} />
          )}

          {currentView === 'expense' && (
            <ExpensePortal onNavigate={handleNavigate} />
          )}

          {(currentView === 'hrms' || currentView === 'staffportal') && (
            <HrmsExecutivePortal
              initialViewMode={currentView === 'staffportal' ? 'employee_self_service' : 'hr_admin'}
              onNavigate={handleNavigate}
            />
          )}
        </Suspense>

        {currentView === 'home' && (
          <>
            {/* 2. Hero */}
            <Hero
              onOpenApply={handleOpenApply}
              onScrollToCalculator={handleScrollToCalculator}
              onNavigateProduct={(prodId) => handleNavigate('product-detail', prodId)}
            />

            {/* 3. "A little support. A bigger possibility." (Comprehensive Product Portfolio) */}
            <ProductBento
              onSelectProduct={(prodId) => handleNavigate('product-detail', prodId)}
            />

            <Suspense fallback={null}>
              {/* 4. Loan Calculator ("Real calculations...") */}
              <InteractiveCalculator
                onOpenApply={handleOpenApply}
                onShowSnackbar={showSnackbar}
              />

              {/* 5. "Institutional payroll..." (TrustMarquee) */}
              <div id="partners">
                <TrustMarquee />
              </div>

              {/* 6. "Prompt liquidity. Disbursed in 15 minutes flat." */}
              <MoveMoneySection onOpenApply={handleOpenApply} />

              {/* 7. "Executive Governance & Integrity" / Leadership */}
              <LeadershipSection />

              {/* 8. FAQ */}
              <FAQSection />

              {/* 9. "Join 100k+ people and testimonial" */}
              <TestimonialsSliderSection />

              {/* 10. "since your last visit.." */}
              <LiveTickingYieldSection
                onOpenApply={handleOpenApply}
                onOpenInvest={() => setInvestModalOpen(true)}
              />

              {/* 11. "Ping us, we’re here" */}
              <ContactSection onShowSnackbar={showSnackbar} />
            </Suspense>
          </>
        )}
      </main>

      {/* 12. Footer with dynamic routing & socials */}
      <Suspense fallback={null}>
        <Footer onOpenApply={handleOpenApply} onNavigate={handleNavigate} />
      </Suspense>

      {/* Material 3 Extended Floating Action Button (Quick Loan Calculator access) */}
      <MaterialFab
        onScrollToCalculator={handleScrollToCalculator}
        isModalOpen={modalOpen || investModalOpen}
      />

      {/* Material 3 Transient Snackbar for actionable feedback */}
      <MaterialSnackbar
        message={snackbarMessage}
        onClose={() => setSnackbarMessage(null)}
      />

      {/* Fast-Track Loan Application Modal (lazy-loaded only when opened) */}
      {modalOpen && (
        <Suspense fallback={null}>
          <ApplyModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            defaultProduct={modalDefaultProduct}
            defaultAmount={modalDefaultAmount}
            defaultTenure={modalDefaultTenure}
            onShowSnackbar={showSnackbar}
          />
        </Suspense>
      )}

      {/* High-Yield Wealth Investment Inquiry Modal (lazy-loaded only when opened) */}
      {investModalOpen && (
        <Suspense fallback={null}>
          <InvestModal
            isOpen={investModalOpen}
            onClose={() => setInvestModalOpen(false)}
            defaultAmount={1000000}
            defaultTenureDays={365}
            onShowSnackbar={showSnackbar}
          />
        </Suspense>
      )}

      {/* Best-Practice Functional & Essential Cookie Consent Modal */}
      <CookieConsent />
    </div>
  );
}
