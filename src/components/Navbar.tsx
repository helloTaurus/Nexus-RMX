import React, { useState, useEffect, useRef } from 'react';
import {
  List,
  X,
  CaretDown,
  Sun,
  Moon,
  Sparkle,
  ShieldCheck,
  CreditCard,
  Bank,
  Car,
  AirplaneTilt,
  Users,
  Storefront,
  Receipt,
  Coins,
  NewspaperClipping,
  Image as ImageIcon,
  Briefcase,
  LockKey,
} from '@phosphor-icons/react';
import { useTheme } from '../hooks/useTheme';

interface NavbarProps {
  onOpenApply: (productName?: string) => void;
  onNavigate: (view: string, productId?: string) => void;
  currentView?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenApply, onNavigate, currentView = 'home' }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'who' | 'products' | null>(null);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [mobileWhoOpen, setMobileWhoOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (view: string, productId?: string) => {
    setActiveDropdown(null);
    setMobileMenuOpen(false);
    onNavigate(view, productId);
  };

  const isHome = currentView === 'home';
  const isLightNavbar = theme === 'light' && (scrolled || !isHome);
  const hasFrostedHeader = scrolled || !isHome;

  return (
    <>
      {/* Full-screen backdrop blur overlay for desktop dropdowns */}
      {activeDropdown && (
        <div
          className="navbar-backdrop-overlay"
          onClick={() => setActiveDropdown(null)}
          aria-hidden="true"
        />
      )}

      {/* Full-screen backdrop blur overlay for mobile drawer */}
      {mobileMenuOpen && (
        <div
          className="navbar-backdrop-overlay xl:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <header
        ref={dropdownRef}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 font-sans ${
          hasFrostedHeader
            ? theme === 'light'
              ? 'navbar-scrolled-header bg-white/95 backdrop-blur-xl border-b border-slate-200/90 shadow-md py-3.5'
              : 'bg-black/92 backdrop-blur-xl border-b border-white/10 shadow-2xl py-3.5'
            : 'navbar-transparent-header bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 md:gap-6">
            {/* Brand Logo: Official NEXUS FINANCE Logo */}
            <button
              onClick={() => handleNavClick('home')}
              className="flex items-center shrink-0 focus-visible:outline-none cursor-pointer"
              aria-label="Nexus Finance Home"
            >
              <img
                src={isLightNavbar ? './assets/nexus/NEXUS-coloured-HOR.png' : './assets/nexus/NEXUS-coloured-HOR-dark.png'}
                alt="Nexus Finance"
                className="h-8 sm:h-9 md:h-10 w-auto object-contain transition-opacity duration-200"
              />
            </button>

            {/* Desktop & Tablet Navigation Bar */}
            <nav className={`hidden xl:flex items-center gap-6 text-sm font-medium font-sans shrink-0 ${
              isLightNavbar ? 'navbar-scrolled-nav text-slate-800' : 'navbar-transparent-nav text-white keep-white'
            }`}>
              {/* Home */}
              <button
                onClick={() => handleNavClick('home')}
                className={`px-3 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                  isLightNavbar
                    ? 'hover:bg-slate-100 hover:text-black text-slate-800'
                    : 'hover:bg-white/10 hover:text-white text-white keep-white'
                }`}
              >
                <span className={isLightNavbar ? '' : 'text-white keep-white'}>Home</span>
              </button>

            {/* Who We Are (Dropdown) */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('who')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'who' ? null : 'who')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer focus:outline-none whitespace-nowrap ${
                  activeDropdown === 'who'
                    ? isLightNavbar
                      ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-sm'
                      : 'nav-selector-active-transparent shadow-sm'
                    : isLightNavbar
                      ? 'hover:bg-slate-100 hover:text-black text-slate-800 border border-transparent'
                      : 'hover:bg-white/10 hover:text-white text-white keep-white border border-transparent'
                }`}
              >
                <span className={isLightNavbar ? '' : 'text-white keep-white'}>Who We Are</span>
                <CaretDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ml-0.5 mr-0.5 ${
                    isLightNavbar ? 'text-slate-600' : 'text-white keep-white'
                  } ${activeDropdown === 'who' ? 'rotate-180' : ''}`}
                />
              </button>

              {activeDropdown === 'who' && (
                <div className="absolute top-full left-0 w-72 pt-2 -mt-1 z-50">
                  <div className="navbar-dropdown rounded-2xl bg-neutral-950/98 border border-white/15 p-2.5 shadow-2xl backdrop-blur-2xl space-y-1">
                    <button
                      onClick={() => handleNavClick('about')}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#00e575] shrink-0" weight="bold" />
                      <div>
                        <div className="text-xs font-semibold text-white">About Us</div>
                        <div className="text-[10px] text-neutral-400">Institutional mandate &amp; vision</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleNavClick('leadership')}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-emerald-400 shrink-0" weight="bold" />
                      <div>
                        <div className="text-xs font-semibold text-white">Leadership Team</div>
                        <div className="text-[10px] text-neutral-400">Led by veterans of Tier-1 banking</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleNavClick('blog')}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                    >
                      <NewspaperClipping className="w-4 h-4 text-cyan-400 shrink-0" weight="bold" />
                      <div>
                        <div className="text-xs font-semibold text-white">
                          Blog &amp; News
                        </div>
                        <div className="text-[10px] text-neutral-400">Financial insights &amp; guides</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleNavClick('gallery')}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 text-amber-400 shrink-0" weight="bold" />
                      <div>
                        <div className="text-xs font-semibold text-white">Gallery</div>
                        <div className="text-[10px] text-neutral-400">Headquarters &amp; office highlights</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleNavClick('careers')}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                    >
                      <Briefcase className="w-4 h-4 text-pink-400 shrink-0" weight="bold" />
                      <div>
                        <div className="text-xs font-semibold text-white">
                          Careers
                        </div>
                        <div className="text-[10px] text-neutral-400">Join our high-performing team</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleNavClick('partners')}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer border-t border-white/5 pt-2"
                    >
                      <Bank className="w-4 h-4 text-sky-400 shrink-0" weight="bold" />
                      <div>
                        <div className="text-xs font-semibold text-white">Institutional Partners</div>
                        <div className="text-[10px] text-neutral-400">National commands &amp; MDAs</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Products (Dropdown linking to dedicated Product Pages) */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('products')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'products' ? null : 'products')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer focus:outline-none whitespace-nowrap ${
                  activeDropdown === 'products'
                    ? isLightNavbar
                      ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-sm'
                      : 'nav-selector-active-transparent shadow-sm'
                    : isLightNavbar
                      ? 'hover:bg-slate-100 hover:text-black text-slate-800 border border-transparent'
                      : 'hover:bg-white/10 hover:text-white text-white keep-white border border-transparent'
                }`}
              >
                <span className={isLightNavbar ? '' : 'text-white keep-white'}>Products</span>
                <CaretDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ml-0.5 mr-0.5 ${
                    isLightNavbar ? 'text-slate-600' : 'text-white keep-white'
                  } ${activeDropdown === 'products' ? 'rotate-180' : ''}`}
                />
              </button>

              {activeDropdown === 'products' && (
                <div className="absolute top-full -left-16 w-84 pt-2 -mt-1 z-50">
                  <div className="navbar-dropdown rounded-2xl bg-neutral-950/98 border border-white/15 p-3 shadow-2xl backdrop-blur-2xl max-h-[480px] overflow-y-auto space-y-1">
                    <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-[#00e575] tracking-wider font-sans">
                      Core Credit Facilities
                    </div>

                    <button
                      onClick={() => handleNavClick('product-detail', 'suremoney-loan')}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                    >
                      <Sparkle className="w-4 h-4 text-[#00e575] shrink-0" weight="bold" />
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          Suremoney Loan
                          <span className="text-[9px] bg-[#00e575]/20 text-[#00e575] px-1.5 py-0.2 rounded">15 Mins</span>
                        </div>
                        <div className="text-[10px] text-neutral-400">Quick personal &amp; business emergency loan</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleNavClick('product-detail', 'nexus-credit')}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" weight="bold" />
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          Nexus Credit
                          <span className="text-[9px] bg-emerald-500/20 text-[#00e575] px-1.5 py-0.2 rounded font-mono">Remita</span>
                        </div>
                        <div className="text-[10px] text-neutral-400">Salary-based instant payroll credit</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleNavClick('product-detail', 'car-for-cash')}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                    >
                      <Car className="w-4 h-4 text-amber-400 shrink-0" weight="bold" />
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          Car-for-Cash (CFC)
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded">2hr Disbursal</span>
                        </div>
                        <div className="text-[10px] text-neutral-400">Urgent cash · Insured depot storage</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleNavClick('product-detail', 'travel-financing')}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                    >
                      <AirplaneTilt className="w-4 h-4 text-sky-400 shrink-0" weight="bold" />
                      <div>
                        <div className="text-xs font-semibold text-white">Travel Financing</div>
                        <div className="text-[10px] text-neutral-400">Embassy visa &amp; study proof of funds</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleNavClick('product-detail', 'women-empowerment')}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-pink-400 shrink-0" weight="bold" />
                      <div>
                        <div className="text-xs font-semibold text-white">Women Empowerment (NWEL)</div>
                        <div className="text-[10px] text-neutral-400">Concessionary capital for female enterprise</div>
                      </div>
                    </button>

                    <div className="border-t border-white/10 my-1 pt-1">
                      <button
                        onClick={() => handleNavClick('product-detail', 'shop-owned-sme')}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                      >
                        <Storefront className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-white">Shop-Owned Loan</div>
                          <div className="text-[10px] text-neutral-400">SME &amp; retail merchant inventory</div>
                        </div>
                      </button>

                      <button
                        onClick={() => handleNavClick('product-detail', 'invoice-discounting')}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                      >
                        <Receipt className="w-4 h-4 text-indigo-400 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-white">Invoice Discounting</div>
                          <div className="text-[10px] text-neutral-400">Unlock 60–90 day receivables</div>
                        </div>
                      </button>

                      <button
                        onClick={() => handleNavClick('product-detail', 'gold-for-cash')}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                      >
                        <Coins className="w-4 h-4 text-amber-300 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-white">Gold-for-Cash (GFC)</div>
                          <div className="text-[10px] text-neutral-400">Appraised physical precious assets</div>
                        </div>
                      </button>

                      <button
                        onClick={() => handleNavClick('product-detail', 'high-yield-investments')}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                      >
                        <LockKey className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                            Fixed Deposit Vaults
                            <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-mono">15.5% APY</span>
                          </div>
                          <div className="text-[10px] text-neutral-400">Guaranteed wealth preservation</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Loan Calculator */}
            <button
              onClick={() => handleNavClick('calculator')}
              className={`px-3 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                isLightNavbar
                  ? 'hover:bg-slate-100 hover:text-black text-slate-800'
                  : 'hover:bg-white/10 hover:text-white text-white keep-white'
              }`}
            >
              <span className={isLightNavbar ? '' : 'text-white keep-white'}>Loan Calculator</span>
            </button>

            {/* Contact Us */}
            <button
              onClick={() => handleNavClick('contact')}
              className={`px-3 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                isLightNavbar
                  ? 'hover:bg-slate-100 hover:text-black text-slate-800'
                  : 'hover:bg-white/10 hover:text-white text-white keep-white'
              }`}
            >
              <span className={isLightNavbar ? '' : 'text-white keep-white'}>Contact Us</span>
            </button>
          </nav>

          {/* Action cluster: Theme Toggle + CTA Pill */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Theme Toggle Button (Light/Dark mode) */}
            <button
              onClick={toggleTheme}
              className={`m3-press m3-ripple transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-medium ${
                theme === 'light'
                  ? isLightNavbar
                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-300 px-3.5 py-1.5 rounded-full shadow-xs'
                    : 'bg-white hover:bg-white/95 text-slate-900 border border-transparent px-3.5 py-1.5 rounded-full shadow-sm'
                  : 'bg-white/10 hover:bg-white/15 text-neutral-200 hover:text-white p-2 sm:px-3 sm:py-2 rounded-full border border-white/10'
              }`}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-300" weight="bold" />
                  <span className="hidden sm:inline text-[11px] font-sans">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" weight="bold" />
                  <span className="hidden sm:inline font-sans font-medium text-slate-900">Dark</span>
                </>
              )}
            </button>

            {/* Apply Now Button */}
            <button
              onClick={() => onOpenApply()}
              className={`navbar-apply-btn m3-press m3-ripple inline-flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap font-sans ${
                theme === 'light'
                  ? 'bg-[#0071e3] hover:bg-[#0077ed] text-white keep-white shadow-md shadow-[#0071e3]/30 hover:shadow-[0_8px_20px_rgba(0,113,227,0.4)]'
                  : 'bg-[#00e575] hover:bg-[#15f38a] text-black shadow-md shadow-[#00e575]/25 hover:shadow-[0_8px_20px_rgba(0,229,117,0.4)]'
              }`}
            >
              <span className={`navbar-apply-text ${theme === 'light' ? 'text-white keep-white' : 'text-black'}`}>Apply Now</span>
            </button>

            {/* Mobile / Tablet menu toggle button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`xl:hidden p-2 focus:outline-none rounded-lg transition-colors navbar-mobile-toggle ${
                isLightNavbar && !mobileMenuOpen
                  ? 'text-slate-800 hover:text-black hover:bg-slate-100'
                  : 'text-white keep-white hover:bg-white/10 navbar-mobile-toggle-white'
              }`}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className={`w-6 h-6 ${isLightNavbar && !mobileMenuOpen ? 'text-slate-800' : 'text-white keep-white'}`} />
              ) : (
                <List className={`w-6 h-6 ${isLightNavbar ? 'text-slate-800' : 'text-white keep-white'}`} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Drawer Menu */}
      {mobileMenuOpen && (
        <div className="navbar-mobile-drawer xl:hidden bg-black/98 border-b border-white/10 px-6 py-6 backdrop-blur-2xl max-h-[85vh] overflow-y-auto font-sans">
          <nav className="flex flex-col gap-3 text-sm font-medium text-neutral-300">
            <button
              onClick={() => handleNavClick('home')}
              className="text-left py-1.5 text-base font-semibold text-white hover:text-[#00e575]"
            >
              Home
            </button>

            {/* Mobile Who We Are Accordion */}
            <div className="border-t border-white/10 pt-2">
              <button
                onClick={() => setMobileWhoOpen(!mobileWhoOpen)}
                className="w-full flex items-center justify-between py-1.5 text-base font-semibold text-white"
              >
                <span>Who We Are</span>
                <CaretDown className={`w-4 h-4 transition-transform ${mobileWhoOpen ? 'rotate-180 text-[#00e575]' : ''}`} />
              </button>
              {mobileWhoOpen && (
                <div className="pl-4 space-y-2 py-2 text-xs text-neutral-300">
                  <button
                    onClick={() => handleNavClick('about')}
                    className="block text-left w-full py-1 text-white/90 hover:text-white transition-colors"
                  >
                    About Us
                  </button>
                  <button
                    onClick={() => handleNavClick('leadership')}
                    className="block text-left w-full py-1 text-white/90 hover:text-white transition-colors"
                  >
                    Leadership Team
                  </button>
                  <button
                    onClick={() => handleNavClick('blog')}
                    className="block text-left w-full py-1 text-white/90 hover:text-white transition-colors"
                  >
                    Blog &amp; News
                  </button>
                  <button
                    onClick={() => handleNavClick('gallery')}
                    className="block text-left w-full py-1 text-white/90 hover:text-white transition-colors"
                  >
                    Gallery &amp; Office Highlights
                  </button>
                  <button
                    onClick={() => handleNavClick('careers')}
                    className="block text-left w-full py-1 text-white/90 hover:text-white transition-colors"
                  >
                    Careers
                  </button>
                  <button
                    onClick={() => handleNavClick('partners')}
                    className="block text-left w-full py-1 text-white/90 hover:text-white transition-colors"
                  >
                    Institutional Partners
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Products Accordion */}
            <div className="border-t border-white/10 pt-2">
              <button
                onClick={() => setMobileProductsOpen(!mobileProductsOpen)}
                className="w-full flex items-center justify-between py-1.5 text-base font-semibold text-white"
              >
                <span>Products</span>
                <CaretDown className={`w-4 h-4 transition-transform ${mobileProductsOpen ? 'rotate-180 text-[#00e575]' : ''}`} />
              </button>
              {mobileProductsOpen && (
                <div className="pl-4 space-y-2 py-2 text-xs text-neutral-300">
                  <button
                    onClick={() => handleNavClick('product-detail', 'suremoney-loan')}
                    className="block text-left w-full py-1 text-white/90 hover:text-white transition-colors"
                  >
                    Suremoney Loan (15-Min Disbursal)
                  </button>
                  <button
                    onClick={() => handleNavClick('product-detail', 'nexus-credit')}
                    className="block text-left w-full py-1 text-white/90 hover:text-white transition-colors"
                  >
                    Nexus Credit (Remita Salary)
                  </button>
                  <button
                    onClick={() => handleNavClick('product-detail', 'car-for-cash')}
                    className="block text-left w-full py-1 text-white/90 hover:text-white transition-colors"
                  >
                    Car-for-Cash (2hr Disbursal · Depot)
                  </button>
                  <button
                    onClick={() => handleNavClick('product-detail', 'travel-financing')}
                    className="block text-left w-full py-1 text-white/90 hover:text-white transition-colors"
                  >
                    Travel Financing (Visa &amp; Study)
                  </button>
                  <button
                    onClick={() => handleNavClick('product-detail', 'women-empowerment')}
                    className="block text-left w-full py-1 text-white/90 hover:text-white transition-colors"
                  >
                    Women Empowerment (NWEL)
                  </button>
                  <button
                    onClick={() => handleNavClick('product-detail', 'shop-owned-sme')}
                    className="block text-left w-full py-1 text-white/90 hover:text-white transition-colors"
                  >
                    Shop-Owned Loan (SOBL)
                  </button>
                  <button
                    onClick={() => handleNavClick('product-detail', 'invoice-discounting')}
                    className="block text-left w-full py-1 text-white/90 hover:text-white transition-colors"
                  >
                    Invoice Discounting Facility (IDF)
                  </button>
                  <button
                    onClick={() => handleNavClick('product-detail', 'gold-for-cash')}
                    className="block text-left w-full py-1 text-white/90 hover:text-white transition-colors"
                  >
                    Gold-for-Cash (GFC)
                  </button>
                  <button
                    onClick={() => handleNavClick('product-detail', 'high-yield-investments')}
                    className="block text-left w-full py-1 text-white/90 hover:text-white transition-colors"
                  >
                    Fixed Deposit Vaults (15.5% APY)
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => handleNavClick('calculator')}
              className="text-left py-1.5 text-base font-semibold text-white hover:text-[#00e575] border-t border-white/10 pt-2"
            >
              Loan Calculator
            </button>

            <button
              onClick={() => handleNavClick('contact')}
              className="text-left py-1.5 text-base font-semibold text-white hover:text-[#00e575]"
            >
              Contact Us
            </button>

            {/* Mobile Theme Toggle Row */}
            <div className="pt-3 flex items-center justify-between border-t border-white/10 text-sm">
              <span className="text-neutral-400">Appearance</span>
              <button
                onClick={toggleTheme}
                className="px-3.5 py-1.5 rounded-full bg-white/10 border border-white/10 flex items-center gap-2 text-xs font-semibold text-white cursor-pointer"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-300" weight="bold" />
                    <span>Switch to Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-400" weight="bold" />
                    <span>Switch to Dark</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenApply();
                }}
                className={`navbar-apply-btn w-full py-3 font-bold text-sm rounded-full text-center shadow-lg cursor-pointer ${
                  theme === 'light'
                    ? 'bg-[#0071e3] hover:bg-[#0077ed] text-white keep-white shadow-[#0071e3]/25'
                    : 'bg-[#00e575] hover:bg-[#15f38a] text-black shadow-[#00e575]/25'
                }`}
              >
                <span className={`navbar-apply-text ${theme === 'light' ? 'text-white keep-white' : 'text-black'}`}>Apply Now</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  </>
  );
};
