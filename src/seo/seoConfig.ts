import { NEXUS_PRODUCTS } from '../data/content';
import { INITIAL_BLOG_POSTS } from '../data/blogData';

export const SITE_URL = 'https://nexusfinanceltd.com';
export const BRAND_NAME = 'Nexus Finance LTD';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/assets/nexus/hero_car.jpg`;

export const BRAND_SOCIALS = [
  'https://facebook.com/nexusfinanceltd',
  'https://instagram.com/nexusfinanceltd',
  'https://linkedin.com/company/nexusfinanceltd',
  'https://tiktok.com/@nexusfinanceltd',
  'https://youtube.com/@nexusfinanceltd',
  'https://x.com/nexusfinanceltd',
];

export const IPPIS_FAQS = [
  {
    question: 'How do I apply for an IPPIS loan in Nigeria with Nexus Finance LTD?',
    answer:
      'Federal civil servants and paramilitary officers on the IPPIS payroll can apply online at nexusfinanceltd.com in under 3 minutes. Provide your IPPIS number, BVN, NIN, valid official ID, and recent 3-month payslips for instant Remita verification and same-day disbursement.',
  },
  {
    question: 'Do I need collateral or a physical guarantor for an IPPIS salary loan?',
    answer:
      'No physical collateral is required. Your active federal employment on the IPPIS / Remita payroll serves as the primary repayment anchor, with automated monthly deductions aligned to civil service net-pay guidelines.',
  },
  {
    question: 'How much can a Nigerian federal civil servant borrow under Nexus Credit (IPPIS)?',
    answer:
      'Eligible federal civil servants and paramilitary personnel can borrow from ₦100,000 up to ₦5,000,000 under Nexus Credit (and up to ₦10,000,000 under Suremoney Loan), subject to verified net salary capacity and WACS/Remita affordability limits.',
  },
  {
    question: 'How fast is IPPIS loan disbursement at Nexus Finance LTD?',
    answer:
      'Once your IPPIS employment, BVN, and Remita mandate are verified, funds are disbursed directly to your salary bank account within 15 minutes to the same business day.',
  },
  {
    question: 'Is Nexus Finance LTD in Abuja the same as NexusRise Finance?',
    answer:
      'No. Nexus Finance LTD is an independent, CAC-incorporated financial services institution headquartered at 2nd Floor, Right Wing, NICON Insurance Building, Central Business District (CBD), Abuja, Nigeria (nexusfinanceltd.com). It is not affiliated with NexusRise Finance.',
  },
  {
    question: 'Which federal agencies and paramilitary commands are eligible for Nexus IPPIS loans?',
    answer:
      'Federal Ministries, Departments, and Agencies (MDAs) on IPPIS, including the Nigeria Police Force (NPF), Nigeria Customs Service (NCS), Nigeria Immigration Service (NIS), NSCDC, Federal Road Safety Corps (FRSC), federal universities, teaching hospitals, and approved corporate payroll partners.',
  },
];

export const HOME_FAQS = [
  {
    question: 'What loans does Nexus Finance LTD offer in Nigeria?',
    answer:
      'Nexus Finance LTD offers IPPIS & Remita Salary Loans (Nexus Credit up to ₦5M), Suremoney Personal & Business Loans (up to ₦10M in 15 minutes), Car-for-Cash vehicle-backed loans (up to ₦25M with 24/7 insured depot storage), Gold-for-Cash (up to ₦20M), Travel Financing / Proof of Funds (up to ₦100M+), Nexus Women Empowerment Loan (NWEL), Shop-Owned SME Loans, and Invoice Discounting.',
  },
  {
    question: 'Where is Nexus Finance LTD located?',
    answer:
      'Nexus Finance LTD is headquartered at 2nd Floor, Right Wing, NICON Insurance Building, Central Business District (CBD), Abuja, Nigeria, and serves borrowers nationwide across all 36 states and the FCT.',
  },
  {
    question: 'How does Car-for-Cash work at Nexus Finance LTD?',
    answer:
      'With Car-for-Cash (CFC), you unlock up to 70% of your vehicle value (up to ₦25,000,000) within 2–4 hours. Your vehicle is inspected and safely stored in our 24/7 insured, climate-controlled depot in Abuja until full loan repayment, then returned in pristine condition.',
  },
  {
    question: 'Can federal civil servants on IPPIS get a fast loan without collateral?',
    answer:
      'Yes. Federal civil servants and paramilitary officers on IPPIS can access collateral-free salary loans up to ₦5,000,000 through Nexus Credit with automated Remita payroll deductions and same-day disbursement.',
  },
];

export interface RouteSeoData {
  path: string;
  title: string;
  description: string;
  canonical: string;
  ogType: 'website' | 'article';
  ogImage: string;
  noindex?: boolean;
  jsonLd: Record<string, unknown>;
}

export function buildOrganizationEntity() {
  return {
    '@type': ['FinancialService', 'Organization'],
    '@id': `${SITE_URL}/#organization`,
    name: BRAND_NAME,
    alternateName: ['Nexus Finance', 'Nexus Finance Nigeria', 'Nexus Finance Limited'],
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/assets/nexus/NEXUS-coloured-1x1.png`,
    },
    image: DEFAULT_OG_IMAGE,
    description:
      'Nexus Finance LTD is a premier CAC-incorporated Nigerian financial services institution headquartered in Central Business District, Abuja, delivering fast IPPIS & Remita salary loans, Suremoney personal/business loans, Car-for-Cash vehicle-backed liquidity, Gold-for-Cash, and Travel Financing across Nigeria.',
    telephone: '+234-809-121-2224',
    email: 'support@nexusfinanceltd.com',
    priceRange: '₦100,000 - ₦100,000,000',
    currenciesAccepted: 'NGN',
    areaServed: {
      '@type': 'Country',
      name: 'Nigeria',
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: '2nd Floor, Right Wing, NICON Insurance Building, Central Business District (CBD)',
      addressLocality: 'Abuja',
      addressRegion: 'FCT',
      addressCountry: 'NG',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 9.05785,
      longitude: 7.49508,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '17:00',
      },
    ],
    sameAs: BRAND_SOCIALS,
  };
}

function buildBreadcrumb(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${item.path}`,
    })),
  };
}

function buildFaqSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

export function getRouteSeo(view: string, param?: string): RouteSeoData {
  const org = buildOrganizationEntity();

  // Exclude internal portals from search indexing
  if (view === 'cms' || view === 'hrms' || view === 'staffportal' || view === 'expense') {
    return {
      path: '/',
      title: `Internal Portal | ${BRAND_NAME}`,
      description: 'Internal operations portal for Nexus Finance LTD staff.',
      canonical: `${SITE_URL}/`,
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
      noindex: true,
      jsonLd: { '@context': 'https://schema.org', '@graph': [org] },
    };
  }

  if (view === 'ippis-loans') {
    const path = '/ippis-loans-nigeria';
    return {
      path,
      title: 'IPPIS Loans in Nigeria for Civil Servants | Nexus Finance',
      description:
        'Apply for fast, no-collateral IPPIS & Remita salary loans up to ₦5M in Nigeria. Same-day disbursement for Federal MDAs & paramilitary officers by Nexus Finance LTD.',
      canonical: `${SITE_URL}${path}`,
      ogType: 'website',
      ogImage: `${SITE_URL}/assets/nexus/corporate_salary_exec.jpg`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          org,
          {
            '@type': 'LoanOrCredit',
            '@id': `${SITE_URL}${path}#loan`,
            name: 'Nexus Credit — IPPIS & Remita Salary Loan Nigeria',
            description:
              'No-collateral IPPIS and Remita payroll-backed salary loan for Nigerian federal civil servants and paramilitary personnel up to ₦5,000,000 with same-day disbursement.',
            provider: { '@id': `${SITE_URL}/#organization` },
            areaServed: { '@type': 'Country', name: 'Nigeria' },
            currency: 'NGN',
            amount: {
              '@type': 'MonetaryAmount',
              currency: 'NGN',
              minValue: 100000,
              maxValue: 5000000,
            },
            loanTerm: {
              '@type': 'QuantitativeValue',
              minValue: 3,
              maxValue: 18,
              unitCode: 'MON',
            },
            requiredCollateral: 'None (IPPIS / Remita payroll deduction)',
          },
          buildBreadcrumb([
            { name: 'Home', path: '/' },
            { name: 'IPPIS Loans Nigeria', path },
          ]),
          buildFaqSchema(IPPIS_FAQS),
        ],
      },
    };
  }

  if (view === 'product-detail' && param) {
    const product = NEXUS_PRODUCTS.find((p) => p.id === param) || NEXUS_PRODUCTS[0];
    const path = `/loans/${product.id}`;
    const productTitleMap: Record<string, string> = {
      'car-for-cash': 'Car-for-Cash Loan in Nigeria (Up to ₦25M) | Nexus Finance',
      'suremoney-loan': 'Suremoney Quick Loan Nigeria (15 Mins) | Nexus Finance',
      'nexus-credit': 'Nexus Credit IPPIS & Remita Salary Loan | Nexus Finance',
      'gold-for-cash': 'Gold-for-Cash Loans in Nigeria (Up to ₦20M) | Nexus Finance',
      'travel-financing': 'Travel Financing & Proof of Funds Nigeria | Nexus Finance',
      'women-empowerment': 'Women Empowerment Loan Nigeria (NWEL) | Nexus Finance',
      'shop-owned-sme': 'SME & Shop Owner Loans in Nigeria | Nexus Finance',
      'invoice-discounting': 'Invoice Discounting Facility Nigeria | Nexus Finance',
    };
    const title = productTitleMap[product.id] || `${product.name} | ${BRAND_NAME}`;
    const description = `${product.tagline}. Access up to ${product.maxAmount} with ${product.turnaroundTime} turnaround from Nexus Finance LTD in Abuja & across Nigeria.`;
    const ogImg =
      product.id === 'car-for-cash'
        ? `${SITE_URL}/assets/nexus/hero_car.jpg`
        : product.id === 'gold-for-cash'
          ? `${SITE_URL}/assets/nexus/gold_vault.jpg`
          : product.id === 'travel-financing'
            ? `${SITE_URL}/assets/nexus/travel_documents.jpg`
            : `${SITE_URL}/assets/nexus/naira_1000_stacks.jpg`;

    return {
      path,
      title,
      description: description.slice(0, 160),
      canonical: `${SITE_URL}${path}`,
      ogType: 'website',
      ogImage: ogImg,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          org,
          {
            '@type': 'LoanOrCredit',
            '@id': `${SITE_URL}${path}#loan`,
            name: `${product.name} — ${BRAND_NAME}`,
            description: product.description,
            provider: { '@id': `${SITE_URL}/#organization` },
            areaServed: { '@type': 'Country', name: 'Nigeria' },
            currency: 'NGN',
            feesAndCommissionsSpecification: product.rateInfo,
            loanType: product.badge,
          },
          buildBreadcrumb([
            { name: 'Home', path: '/' },
            { name: 'Loans', path: '/about' },
            { name: product.name, path },
          ]),
        ],
      },
    };
  }

  if (view === 'about') {
    const path = '/about';
    return {
      path,
      title: 'About Nexus Finance LTD | Abuja Lending & Wealth Experts',
      description:
        'Learn about Nexus Finance LTD in Central Business District, Abuja — Nigeria’s trusted CAC-incorporated lender for IPPIS loans, Car-for-Cash, and SME credit.',
      canonical: `${SITE_URL}${path}`,
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          org,
          {
            '@type': 'AboutPage',
            url: `${SITE_URL}${path}`,
            name: `About ${BRAND_NAME}`,
            mainEntity: { '@id': `${SITE_URL}/#organization` },
          },
          buildBreadcrumb([
            { name: 'Home', path: '/' },
            { name: 'About Us', path },
          ]),
        ],
      },
    };
  }

  if (view === 'blog') {
    if (param) {
      const post = INITIAL_BLOG_POSTS.find((p) => p.slug === param || p.id === param);
      if (post) {
        const slug = post.slug || post.id;
        const path = `/blog/${slug}`;
        const imgPath = post.image.startsWith('./')
          ? `${SITE_URL}/${post.image.slice(2)}`
          : `${SITE_URL}${post.image}`;
        const shortTitle =
          post.title.length <= 58
            ? post.title
            : `${post.title.slice(0, 55).replace(/\s+\S*$/, '')}`;
        return {
          path,
          title: `${shortTitle} | Nexus Finance`,
          description: post.excerpt.slice(0, 158),
          canonical: `${SITE_URL}${path}`,
          ogType: 'article',
          ogImage: imgPath,
          jsonLd: {
            '@context': 'https://schema.org',
            '@graph': [
              org,
              {
                '@type': 'Article',
                headline: post.title,
                description: post.excerpt,
                image: imgPath,
                author: {
                  '@type': 'Person',
                  name: post.author,
                  jobTitle: post.authorRole,
                },
                publisher: { '@id': `${SITE_URL}/#organization` },
                datePublished: post.date,
                mainEntityOfPage: `${SITE_URL}${path}`,
              },
              buildBreadcrumb([
                { name: 'Home', path: '/' },
                { name: 'Blog & Guides', path: '/blog' },
                { name: post.title, path },
              ]),
            ],
          },
        };
      }
    }
    const path = '/blog';
    return {
      path,
      title: 'Loan Guides, IPPIS & Finance Blog | Nexus Finance LTD',
      description:
        'Expert guides on IPPIS civil servant loans, Remita credit, Car-for-Cash, Proof of Funds, and wealth management in Nigeria from Nexus Finance LTD.',
      canonical: `${SITE_URL}${path}`,
      ogType: 'website',
      ogImage: `${SITE_URL}/assets/nexus/naira_1000_stacks.jpg`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          org,
          buildBreadcrumb([
            { name: 'Home', path: '/' },
            { name: 'Blog & Guides', path },
          ]),
        ],
      },
    };
  }

  if (view === 'careers') {
    const path = '/careers';
    return {
      path,
      title: 'Careers at Nexus Finance LTD | Jobs in Abuja, Nigeria',
      description:
        'Join Nexus Finance LTD in Central Business District, Abuja. Explore open roles in credit risk, fintech engineering, operations, and corporate finance.',
      canonical: `${SITE_URL}${path}`,
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          org,
          buildBreadcrumb([
            { name: 'Home', path: '/' },
            { name: 'Careers', path },
          ]),
        ],
      },
    };
  }

  if (view === 'gallery') {
    const path = '/gallery';
    return {
      path,
      title: 'Institutional Gallery & Media | Nexus Finance LTD',
      description:
        'Explore Nexus Finance LTD headquarters in Abuja, executive leadership milestones, and community finance initiatives across Nigeria.',
      canonical: `${SITE_URL}${path}`,
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          org,
          buildBreadcrumb([
            { name: 'Home', path: '/' },
            { name: 'Gallery', path },
          ]),
        ],
      },
    };
  }

  // Default: Home Page
  return {
    path: '/',
    title: 'Nexus Finance LTD — Fast Loans, IPPIS & Car-for-Cash Nigeria',
    description:
      'Nexus Finance LTD in Abuja delivers fast 15-minute personal loans, no-collateral IPPIS & Remita civil servant loans, Car-for-Cash, and Travel Financing across Nigeria.',
    canonical: `${SITE_URL}/`,
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        org,
        {
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#website`,
          url: `${SITE_URL}/`,
          name: BRAND_NAME,
          alternateName: 'Nexus Finance',
          publisher: { '@id': `${SITE_URL}/#organization` },
        },
        buildFaqSchema(HOME_FAQS),
      ],
    },
  };
}

/**
 * Resolve the base path prefix (e.g. '/Nexus-RMX' on GitHub Pages subpath, or '' on custom domain / localhost).
 */
export function getRuntimeBasePath(): string {
  if (typeof window === 'undefined') return '';
  const pathname = window.location.pathname;
  if (pathname === '/Nexus-RMX' || pathname.startsWith('/Nexus-RMX/')) {
    return '/Nexus-RMX';
  }
  return '';
}

export function buildClientUrl(routePath: string): string {
  const base = getRuntimeBasePath();
  const normalized = routePath.startsWith('/') ? routePath : `/${routePath}`;
  if (normalized === '/') return base ? `${base}/` : '/';
  return `${base}${normalized}`;
}

export function parseRouteFromLocation(): { view: string; param?: string } {
  if (typeof window === 'undefined') return { view: 'home' };
  const host = window.location.hostname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  if (host.startsWith('expense') || hash === '#expense') return { view: 'expense' };
  if (hash === '#staffportal') return { view: 'staffportal' };
  if (hash === '#hrms') return { view: 'hrms' };
  if (hash === '#cms') return { view: 'cms' };

  const base = getRuntimeBasePath();
  let rel = window.location.pathname;
  if (base && rel.startsWith(base)) {
    rel = rel.slice(base.length) || '/';
  }
  rel = rel.replace(/\/+$/, '') || '/';

  if (rel === '/ippis-loans-nigeria' || rel === '/ippis-loans') {
    return { view: 'ippis-loans' };
  }
  if (rel.startsWith('/loans/')) {
    const prodId = rel.slice('/loans/'.length);
    return { view: 'product-detail', param: prodId || 'suremoney-loan' };
  }
  if (rel === '/about') return { view: 'about' };
  if (rel === '/blog') return { view: 'blog' };
  if (rel.startsWith('/blog/')) {
    return { view: 'blog', param: rel.slice('/blog/'.length) };
  }
  if (rel === '/careers') return { view: 'careers' };
  if (rel === '/gallery') return { view: 'gallery' };
  return { view: 'home' };
}
