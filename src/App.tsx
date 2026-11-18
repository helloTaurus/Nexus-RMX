import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { TrustMarquee } from './components/TrustMarquee';
import {
  MoveMoneySection,
  TestimonialsSliderSection,
  LiveTickingYieldSection,
} from './components/TuyoShowcaseSections';
import { ProductBento } from './components/ProductBento';
import { InteractiveCalculator } from './components/InteractiveCalculator';
import { LeadershipSection } from './components/LeadershipSection';
import { FAQSection } from './components/FAQSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { ApplyModal } from './components/ApplyModal';
import { InvestModal } from './components/InvestModal';
import { AboutUsPage } from './components/AboutUsPage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { BlogPage } from './components/BlogPage';
import { CareersPage } from './components/CareersPage';
import { GalleryPage } from './components/GalleryPage';
import { CmsPortal } from './components/CmsPortal';
import { HrmsExecutivePortal } from './components/HrmsExecutivePortal';
import { ExpensePortal } from './components/ExpensePortal';
import { MaterialFab } from './components/MaterialFab';
import { MaterialSnackbar, SnackbarMessage } from './components/MaterialSnackbar';
import { LoadingScreen } from './components/LoadingScreen';
import { CookieConsent } from './components/CookieConsent';
import { useIOReveal } from './hooks/useIOReveal';

type ActiveView =
  | 'home'
  | 'about'
  | 'blog'
  | 'careers'
  | 'gallery'
  | 'product-detail'
  | 'cms'
  | 'hrms'
  | 'staffportal'
  | 'expense';

export default function App() {
  const [currentView, setCurrentView] = useState<ActiveView>('home');
  const [selectedProductId, setSelectedProductId] = useState<string>('suremoney-loan');

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

  // Trigger intersection observer reveal animation on viewport entry
  useIOReveal('.io-reveal');

  // Support direct hash navigation like #cms, #hrms, #staffportal, and #expense (or expense. subdomain)
  React.useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
      if (host.startsWith('expense') || hash === '#expense') {
        setCurrentView('expense');
      } else if (hash === '#staffportal') {
        setCurrentView('staffportal');
      } else if (hash === '#hrms') {
        setCurrentView('hrms');
      } else if (hash === '#cms') {
        setCurrentView('cms');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleOpenApply = (productName?: string, amount?: number, tenure?: number) => {
    setModalDefaultProduct(productName);
    setModalDefaultAmount(amount);
    setModalDefaultTenure(tenure);
    setModalOpen(true);
  };

  const handleNavigate = (view: string, productId?: string) => {
    if (view === 'product-detail') {
      setSelectedProductId(productId || 'suremoney-loan');
      setCurrentView('product-detail');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'about') {
      setCurrentView('about');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'blog') {
      setCurrentView('blog');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'careers') {
      setCurrentView('careers');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'gallery') {
      setCurrentView('gallery');
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
        {currentView === 'about' && (
          <AboutUsPage onOpenApply={handleOpenApply} onNavigate={handleNavigate} />
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
          <BlogPage onNavigate={handleNavigate} onOpenApply={handleOpenApply} />
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
          </>
        )}
      </main>

      {/* 12. Footer with dynamic routing & socials */}
      <Footer onOpenApply={handleOpenApply} onNavigate={handleNavigate} />

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

      {/* Fast-Track Loan Application Modal */}
      <ApplyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultProduct={modalDefaultProduct}
        defaultAmount={modalDefaultAmount}
        defaultTenure={modalDefaultTenure}
        onShowSnackbar={showSnackbar}
      />

      {/* High-Yield Wealth Investment Inquiry Modal */}
      <InvestModal
        isOpen={investModalOpen}
        onClose={() => setInvestModalOpen(false)}
        defaultAmount={1000000}
        defaultTenureDays={365}
        onShowSnackbar={showSnackbar}
      />

      {/* Best-Practice Functional & Essential Cookie Consent Modal */}
      <CookieConsent />
    </div>
  );
}
