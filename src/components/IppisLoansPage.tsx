import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle,
  ShieldCheck,
  Clock,
  CurrencyNgn,
  Buildings,
  FileText,
  CaretDown,
  Calculator,
  PhoneCall,
  MapPin,
} from '@phosphor-icons/react';
import { IPPIS_FAQS } from '../seo/seoConfig';

interface IppisLoansPageProps {
  onOpenApply: (productName?: string, amount?: number, tenure?: number) => void;
  onNavigate: (view: string, productId?: string) => void;
}

const COVERED_MDAS = [
  { code: 'NPF', label: 'Nigeria Police Force' },
  { code: 'NCS', label: 'Nigeria Customs Service' },
  { code: 'NIS', label: 'Nigeria Immigration Service' },
  { code: 'NSCDC', label: 'Nigeria Security & Civil Defence Corps' },
  { code: 'FRSC', label: 'Federal Road Safety Corps' },
  { code: 'MDAs', label: 'Federal Ministries, Departments & Agencies' },
  { code: 'FUTH', label: 'Federal Teaching Hospitals & Medical Centres' },
  { code: 'FUNI', label: 'Federal Universities & Polytechnics' },
];

const APPLICATION_STEPS = [
  {
    step: '01',
    title: 'Submit Your IPPIS Application Online',
    description:
      'Enter your full name, IPPIS number, MDA/command, desired loan amount (₦100,000 – ₦5,000,000), and preferred tenure (3 – 18 months).',
  },
  {
    step: '02',
    title: 'Instant Remita & Net-Pay Verification',
    description:
      'Our automated credit desk verifies your BVN, NIN, recent 3-month payslips, and WACS/Remita net-pay affordability limit in minutes.',
  },
  {
    step: '03',
    title: 'Approve Direct Payroll Mandate',
    description:
      'Authorize a transparent, civil-service-compliant Remita payroll deduction mandate with zero hidden charges or surprise debits.',
  },
  {
    step: '04',
    title: 'Same-Day Direct Bank Disbursement',
    description:
      'Receive funds directly into your salary bank account within 15 minutes to the same business day across all 36 states and FCT Abuja.',
  },
];

export const IppisLoansPage: React.FC<IppisLoansPageProps> = ({ onOpenApply, onNavigate }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <article className="pt-24 pb-20 bg-black text-white font-sans min-h-screen">
      {/* Semantic Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6"
      >
        <ol className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
          <li>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="hover:text-[#00e575] transition-colors cursor-pointer"
            >
              Home
            </button>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <button
              type="button"
              onClick={() => onNavigate('about-products')}
              className="hover:text-[#00e575] transition-colors cursor-pointer"
            >
              Loans
            </button>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-[#00e575] font-semibold" aria-current="page">
            IPPIS Loans in Nigeria
          </li>
        </ol>
      </nav>

      {/* Hero Section */}
      <header className="relative overflow-hidden border-y border-white/10 bg-neutral-950/90 py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold px-3 py-1 rounded-full bg-[#00e575]/10 text-[#00e575] border border-[#00e575]/25">
                  IPPIS &amp; Remita Salary Loans
                </span>
                <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                  Zero Collateral
                </span>
                <span className="text-xs font-medium text-neutral-300 bg-white/[0.05] px-3 py-1 rounded-full border border-white/10">
                  WACS-Compliant Deductions
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white font-display leading-[1.08]">
                IPPIS Loans in Nigeria for Federal Civil Servants &amp; Paramilitary Officers
              </h1>

              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed max-w-2xl">
                Access fast, collateral-free salary loans from <strong className="text-white">₦100,000 up to ₦5,000,000</strong> through <strong className="text-[#00e575]">Nexus Finance LTD</strong> (Central Business District, Abuja). Powered by automated IPPIS &amp; Remita payroll deductions with same-day direct bank disbursement nationwide.
              </p>

              <div className="pt-2 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => onOpenApply('Nexus Credit', 1000000, 6)}
                  className="px-8 py-4 rounded-full bg-[#00e575] hover:bg-[#15f38a] text-black font-bold text-sm transition-all shadow-xl shadow-[#00e575]/25 flex items-center gap-2 cursor-pointer"
                >
                  <span>Apply for IPPIS Loan Now</span>
                  <ArrowRight className="w-4 h-4" weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('calculator')}
                  className="px-6 py-4 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/15 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Calculator className="w-4 h-4 text-[#00e575]" />
                  <span>Calculate Monthly Repayment</span>
                </button>
              </div>
            </div>

            {/* AI-Citable Quick Facts Card */}
            <aside className="lg:col-span-5 p-6 sm:p-7 rounded-3xl bg-neutral-900/70 border border-white/10 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#00e575]">
                  IPPIS Loan Quick Facts (2026)
                </span>
                <ShieldCheck className="w-5 h-5 text-[#00e575]" weight="duotone" />
              </div>

              <dl className="divide-y divide-white/5 text-sm">
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-neutral-400">Provider</dt>
                  <dd className="font-semibold text-white text-right">Nexus Finance LTD (Abuja)</dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-neutral-400">Loan Amount</dt>
                  <dd className="font-semibold text-[#00e575] text-right">₦100,000 – ₦5,000,000</dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-neutral-400">Disbursement Speed</dt>
                  <dd className="font-semibold text-white text-right">15 Mins – Same Day</dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-neutral-400">Repayment Tenure</dt>
                  <dd className="font-semibold text-white text-right">3 – 18 Months Flexible</dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-neutral-400">Collateral Required</dt>
                  <dd className="font-semibold text-white text-right">None (Salary-Backed)</dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-neutral-400">Repayment Channel</dt>
                  <dd className="font-semibold text-white text-right">IPPIS / Remita Direct</dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-neutral-400">Coverage</dt>
                  <dd className="font-semibold text-white text-right">All 36 States &amp; FCT Abuja</dd>
                </div>
              </dl>
            </aside>
          </div>
        </div>
      </header>

      {/* Requirements & Covered MDAs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Requirements */}
          <div className="p-7 sm:p-8 rounded-3xl bg-neutral-900/50 border border-white/10 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00e575]/10 border border-[#00e575]/20 flex items-center justify-center text-[#00e575]">
                <FileText className="w-5 h-5" weight="duotone" />
              </div>
              <h2 className="text-2xl font-bold font-display text-white">
                IPPIS Loan Requirements in Nigeria
              </h2>
            </div>
            <p className="text-sm text-neutral-300 leading-relaxed">
              To qualify for an IPPIS salary loan from Nexus Finance LTD, federal civil servants and paramilitary personnel need only basic payroll and identity documentation:
            </p>
            <ul className="space-y-3 text-sm text-neutral-200">
              {[
                'Active Federal Civil Service or Paramilitary IPPIS Number',
                'Bank Verification Number (BVN) & National Identification Number (NIN)',
                'Recent 3-month IPPIS Payslips confirming sufficient net take-home pay',
                'Valid Official Staff ID Card or Letter of Employment / Confirmation',
                'Active Salary Bank Account with Remita Direct Debit Mandate',
              ].map((req) => (
                <li key={req} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#00e575] shrink-0 mt-0.5" weight="fill" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Covered Federal MDAs */}
          <div className="p-7 sm:p-8 rounded-3xl bg-neutral-900/50 border border-white/10 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00e575]/10 border border-[#00e575]/20 flex items-center justify-center text-[#00e575]">
                <Buildings className="w-5 h-5" weight="duotone" />
              </div>
              <h2 className="text-2xl font-bold font-display text-white">
                Eligible Federal MDAs &amp; Commands
              </h2>
            </div>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Nexus Finance LTD maintains pre-established underwriting schedules across Nigeria&apos;s major federal ministries, tertiary institutions, and paramilitary formations:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COVERED_MDAS.map((mda) => (
                <div
                  key={mda.code}
                  className="p-3.5 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-3"
                >
                  <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-[#00e575]/10 text-[#00e575] border border-[#00e575]/20 shrink-0">
                    {mda.code}
                  </span>
                  <span className="text-xs text-neutral-200 font-medium">{mda.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How to Apply Step-by-Step */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/10">
        <div className="max-w-3xl mb-10">
          <span className="text-xs uppercase tracking-widest text-[#00e575] font-bold">
            Fast 4-Step Approval
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-white mt-2">
            How to Get an IPPIS Loan Disbursed Same Day
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {APPLICATION_STEPS.map((item) => (
            <div
              key={item.step}
              className="p-6 rounded-3xl bg-neutral-900/50 border border-white/10 flex flex-col justify-between space-y-4"
            >
              <div className="text-3xl font-black font-display text-[#00e575]/80">{item.step}</div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">{item.title}</h3>
                <p className="text-xs text-neutral-300 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Related Loan Solutions (Internal Linking for SEO) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/10">
        <h2 className="text-xl sm:text-2xl font-bold font-display text-white mb-6">
          Explore Other Fast Loan Facilities by Nexus Finance LTD
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              id: 'suremoney-loan',
              title: 'Suremoney Loan (Up to ₦10M)',
              desc: '15-minute personal and business credit for emergencies and commercial opportunities.',
              icon: <Clock className="w-5 h-5 text-[#00e575]" />,
            },
            {
              id: 'car-for-cash',
              title: 'Car-for-Cash (Up to ₦25M)',
              desc: 'Unlock up to 70% of your vehicle value with 24/7 insured Abuja depot storage.',
              icon: <CurrencyNgn className="w-5 h-5 text-[#00e575]" />,
            },
            {
              id: 'gold-for-cash',
              title: 'Gold-for-Cash (Up to ₦20M)',
              desc: 'Immediate vault-backed liquidity against appraised gold bullion or jewelry.',
              icon: <ShieldCheck className="w-5 h-5 text-[#00e575]" />,
            },
          ].map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onNavigate('product-detail', card.id)}
              className="p-6 rounded-3xl bg-neutral-900/50 hover:bg-neutral-900 border border-white/10 hover:border-[#00e575]/40 text-left transition-all cursor-pointer space-y-3"
            >
              <div className="flex items-center justify-between">
                {card.icon}
                <ArrowRight className="w-4 h-4 text-neutral-400" />
              </div>
              <h3 className="text-base font-bold text-white">{card.title}</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">{card.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* IPPIS & Brand Disambiguation FAQ Accordion */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-white/10">
        <div className="text-center mb-10">
          <span className="text-xs uppercase tracking-widest text-[#00e575] font-bold">
            Frequently Asked Questions
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-white mt-2">
            IPPIS Loans &amp; Nexus Finance LTD Answers
          </h2>
        </div>

        <div className="space-y-3">
          {IPPIS_FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={faq.question}
                className="rounded-2xl bg-neutral-900/60 border border-white/10 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-white/[0.03] transition-colors"
                >
                  <span className="text-sm sm:text-base font-semibold text-white">
                    {faq.question}
                  </span>
                  <CaretDown
                    className={`w-4 h-4 text-[#00e575] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-neutral-300 leading-relaxed border-t border-white/5 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Institutional Contact Bar */}
        <div className="mt-12 p-6 rounded-3xl bg-[#00e575]/10 border border-[#00e575]/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#00e575]" />
              <span>Nexus Finance LTD — Abuja Head Office</span>
            </div>
            <p className="text-xs text-neutral-300">
              2nd Floor, Right Wing, NICON Insurance Building, Central Business District (CBD), Abuja • +234 809 121 2224
            </p>
          </div>
          <a
            href="tel:+2348091212224"
            className="px-5 py-2.5 rounded-full bg-[#00e575] text-black font-bold text-xs flex items-center gap-2 shrink-0 hover:bg-[#15f38a] transition-colors"
          >
            <PhoneCall className="w-4 h-4" weight="bold" />
            <span>Call Credit Desk</span>
          </a>
        </div>
      </section>
    </article>
  );
};
