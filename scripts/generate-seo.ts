import fs from 'node:fs';
import path from 'node:path';
import { NEXUS_PRODUCTS, LEADERSHIP_TEAM, KEY_PARTNERS } from '../src/data/content.ts';
import { INITIAL_BLOG_POSTS } from '../src/data/blogData.ts';
import {
  SITE_URL,
  BRAND_NAME,
  IPPIS_FAQS,
  HOME_FAQS,
  getRouteSeo,
  type RouteSeoData,
} from '../src/seo/seoConfig.ts';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const TODAY = new Date().toISOString().slice(0, 10);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildNavHtml(depthPrefix: string): string {
  return `
    <nav aria-label="Primary Navigation">
      <a href="${depthPrefix}">Nexus Finance LTD Home</a> |
      <a href="${depthPrefix}ippis-loans-nigeria/">IPPIS Loans Nigeria</a> |
      <a href="${depthPrefix}loans/car-for-cash/">Car-for-Cash Loans</a> |
      <a href="${depthPrefix}loans/suremoney-loan/">Suremoney Loan</a> |
      <a href="${depthPrefix}loans/nexus-credit/">Nexus Credit</a> |
      <a href="${depthPrefix}loans/gold-for-cash/">Gold-for-Cash</a> |
      <a href="${depthPrefix}loans/travel-financing/">Travel Financing &amp; Proof of Funds</a> |
      <a href="${depthPrefix}about/">About Nexus Finance LTD</a> |
      <a href="${depthPrefix}blog/">Blog &amp; Guides</a> |
      <a href="${depthPrefix}careers/">Careers</a>
    </nav>`;
}

function buildHomeBodyHtml(): string {
  const productLinks = NEXUS_PRODUCTS.map(
    (p) =>
      `<li><a href="./loans/${p.id}/"><strong>${escapeHtml(p.name)}</strong></a> — ${escapeHtml(
        p.tagline
      )} (Up to ${escapeHtml(p.maxAmount || 'Flexible')}, ${escapeHtml(p.turnaroundTime)}). ${escapeHtml(p.description)}</li>`
  ).join('\n');

  const faqHtml = HOME_FAQS.map(
    (f) => `<dt><strong>${escapeHtml(f.question)}</strong></dt><dd>${escapeHtml(f.answer)}</dd>`
  ).join('\n');

  return `
    <main>
      ${buildNavHtml('./')}
      <h1>Nexus Finance LTD — Fast Loans, IPPIS Civil Servant Credit &amp; Car-for-Cash in Nigeria</h1>
      <p>Nexus Finance LTD (${SITE_URL}) is a CAC-incorporated financial services institution headquartered at 2nd Floor, Right Wing, NICON Insurance Building, Central Business District (CBD), Abuja, Nigeria. Phone: +234 809 121 2224 | Email: support@nexusfinanceltd.com.</p>
      <section>
        <h2>Loan &amp; Liquidity Products in Nigeria</h2>
        <ul>
          <li><a href="./ippis-loans-nigeria/"><strong>IPPIS &amp; Federal Civil Servant Loans in Nigeria</strong></a> — Collateral-free salary loans up to ₦5,000,000 via Remita/IPPIS payroll deduction with same-day disbursement.</li>
          ${productLinks}
        </ul>
      </section>
      <section>
        <h2>Frequently Asked Questions</h2>
        <dl>${faqHtml}</dl>
      </section>
    </main>`;
}

function buildIppisBodyHtml(): string {
  const faqHtml = IPPIS_FAQS.map(
    (f) => `<dt><strong>${escapeHtml(f.question)}</strong></dt><dd>${escapeHtml(f.answer)}</dd>`
  ).join('\n');

  return `
    <main>
      ${buildNavHtml('../')}
      <h1>IPPIS Loans in Nigeria for Federal Civil Servants &amp; Paramilitary Officers</h1>
      <p>Access fast, no-collateral IPPIS and Remita salary loans from ₦100,000 up to ₦5,000,000 through Nexus Finance LTD (Central Business District, Abuja). Same-day direct bank disbursement across all 36 states and FCT Abuja with WACS-compliant net-pay deductions.</p>
      <section>
        <h2>IPPIS Loan Requirements</h2>
        <ul>
          <li>Active Federal Civil Service or Paramilitary IPPIS Number (NPF, NCS, NIS, NSCDC, FRSC, Federal MDAs, Federal Universities &amp; Teaching Hospitals)</li>
          <li>Bank Verification Number (BVN) and National Identification Number (NIN)</li>
          <li>Recent 3-month IPPIS payslips confirming sufficient net pay</li>
          <li>Valid Official Staff ID Card or Letter of Employment</li>
          <li>Remita Direct Payroll Mandate</li>
        </ul>
      </section>
      <section>
        <h2>IPPIS Loans FAQ</h2>
        <dl>${faqHtml}</dl>
      </section>
    </main>`;
}

function buildProductBodyHtml(productId: string): string {
  const p = NEXUS_PRODUCTS.find((item) => item.id === productId) || NEXUS_PRODUCTS[0];
  const reqs = p.requirements.map((r) => `<li>${escapeHtml(r)}</li>`).join('\n');
  return `
    <main>
      ${buildNavHtml('../../')}
      <h1>${escapeHtml(p.name)} — ${BRAND_NAME} Nigeria</h1>
      <p><strong>${escapeHtml(p.tagline)}</strong></p>
      <p>${escapeHtml(p.description)}</p>
      <ul>
        <li>Maximum Amount: ${escapeHtml(p.maxAmount || 'Flexible')}</li>
        <li>Turnaround Time: ${escapeHtml(p.turnaroundTime)}</li>
        <li>Tenure: ${escapeHtml(p.tenure || 'Flexible')}</li>
        <li>Rate Info: ${escapeHtml(p.rateInfo)}</li>
        <li>Key Benefit: ${escapeHtml(p.keyBenefit)}</li>
      </ul>
      <h2>Requirements</h2>
      <ul>${reqs}</ul>
      <p>Head Office: 2nd Floor, Right Wing, NICON Insurance Building, Central Business District (CBD), Abuja, Nigeria | +234 809 121 2224 | support@nexusfinanceltd.com</p>
    </main>`;
}

function buildAboutBodyHtml(): string {
  const leaders = LEADERSHIP_TEAM.map(
    (l) => `<li><strong>${escapeHtml(l.name)}</strong> — ${escapeHtml(l.role)}: ${escapeHtml(l.bio)}</li>`
  ).join('\n');
  const partners = KEY_PARTNERS.map(
    (p) => `<li><strong>${escapeHtml(p.acronym)}</strong> (${escapeHtml(p.name)}) — ${escapeHtml(p.description)}</li>`
  ).join('\n');
  return `
    <main>
      ${buildNavHtml('../')}
      <h1>About Nexus Finance LTD — Abuja Head Office &amp; Leadership</h1>
      <p>Nexus Finance LTD (${SITE_URL}) is an independent, CAC-incorporated financial services institution headquartered at 2nd Floor, Right Wing, NICON Insurance Building, Central Business District (CBD), Abuja, Nigeria. It is distinct from similarly named lenders such as NexusRise Finance.</p>
      <h2>Executive Leadership Team</h2>
      <ul>${leaders}</ul>
      <h2>Institutional &amp; Payroll Partners</h2>
      <ul>${partners}</ul>
    </main>`;
}

function buildBlogIndexBodyHtml(): string {
  const items = INITIAL_BLOG_POSTS.map(
    (post) =>
      `<li><a href="./${escapeHtml(post.slug || post.id)}/"><strong>${escapeHtml(
        post.title
      )}</strong></a> (${escapeHtml(post.date)}) — ${escapeHtml(post.excerpt)}</li>`
  ).join('\n');
  return `
    <main>
      ${buildNavHtml('../')}
      <h1>Nexus Finance LTD Blog — IPPIS Loans, Car-for-Cash &amp; Financial Guides in Nigeria</h1>
      <ul>${items}</ul>
    </main>`;
}

function buildBlogPostBodyHtml(slug: string): string {
  const post = INITIAL_BLOG_POSTS.find((p) => (p.slug || p.id) === slug) || INITIAL_BLOG_POSTS[0];
  const paragraphs = post.content
    .split(/\n\n+/)
    .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
    .join('\n');
  return `
    <main>
      ${buildNavHtml('../../')}
      <article>
        <h1>${escapeHtml(post.title)}</h1>
        <p>By ${escapeHtml(post.author)} (${escapeHtml(post.authorRole)}) • ${escapeHtml(post.date)} • ${escapeHtml(post.category)}</p>
        <p><strong>${escapeHtml(post.excerpt)}</strong></p>
        ${paragraphs}
      </article>
    </main>`;
}

function renderRouteHtml(templateHtml: string, seo: RouteSeoData, bodyHtml: string, depth: number): string {
  const depthPrefix = depth === 0 ? './' : '../'.repeat(depth);
  let html = templateHtml;

  // Inject <base> for nested routes so relative ./assets/ links in HTML & React components resolve to site root
  if (depth > 0) {
    html = html.replace('<head>', `<head>\n    <base href="${depthPrefix}" />`);
  }

  // Replace <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(seo.title)}</title>`);

  // Replace meta description
  html = html.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`
  );

  // Replace canonical
  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${escapeHtml(seo.canonical)}" />`
  );

  // Replace OpenGraph tags
  html = html
    .replace(
      /<meta property="og:type" content="[^"]*"\s*\/?>/,
      `<meta property="og:type" content="${escapeHtml(seo.ogType)}" />`
    )
    .replace(
      /<meta property="og:url" content="[^"]*"\s*\/?>/,
      `<meta property="og:url" content="${escapeHtml(seo.canonical)}" />`
    )
    .replace(
      /<meta property="og:title" content="[^"]*"\s*\/?>/,
      `<meta property="og:title" content="${escapeHtml(seo.title)}" />`
    )
    .replace(
      /<meta property="og:description" content="[^"]*"\s*\/?>/,
      `<meta property="og:description" content="${escapeHtml(seo.description)}" />`
    )
    .replace(
      /<meta property="og:image" content="[^"]*"\s*\/?>/,
      `<meta property="og:image" content="${escapeHtml(seo.ogImage)}" />`
    );

  // Replace Twitter tags
  html = html
    .replace(
      /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`
    )
    .replace(
      /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`
    )
    .replace(
      /<meta name="twitter:image" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:image" content="${escapeHtml(seo.ogImage)}" />`
    );

  // Replace JSON-LD block
  html = html.replace(
    /<script id="nexus-seo-jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script id="nexus-seo-jsonld" type="application/ld+json">${JSON.stringify(seo.jsonLd)}</script>`
  );

  // Inject semantic prerendered HTML inside #root (React createRoot replaces it seamlessly on hydration)
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root"><div class="sr-only">${bodyHtml}</div></div>`
  );

  return html;
}

function generateRobotsTxt(): string {
  return `# Nexus Finance LTD — Crawler & AI Search Engine Access Policy
User-agent: *
Allow: /
Disallow: /api/

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Applebot
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

function generateSitemapXml(routes: { path: string; priority: string; changefreq: string }[]): string {
  const urls = routes
    .map((r) => {
      const loc = r.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${r.path}`;
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function generateLlmsTxt(): string {
  const productLines = NEXUS_PRODUCTS.map(
    (p) => `- [${p.name}](${SITE_URL}/loans/${p.id}): Up to ${p.maxAmount}, ${p.turnaroundTime} — ${p.tagline}`
  ).join('\n');

  return `# Nexus Finance LTD

> Nexus Finance LTD (${SITE_URL}) is an independent, CAC-incorporated Nigerian financial services institution headquartered at 2nd Floor, Right Wing, NICON Insurance Building, Central Business District (CBD), Abuja, Nigeria. It is not affiliated with NexusRise Finance.

## Key Contact & Entity Facts
- Official Website: ${SITE_URL}
- Head Office: 2nd Floor, Right Wing, NICON Insurance Building, Central Business District (CBD), Abuja, FCT, Nigeria
- Phone: +234 809 121 2224
- Email: support@nexusfinanceltd.com
- Service Area: All 36 States of Nigeria & FCT Abuja
- Hours: Monday – Friday, 8:00 AM – 5:00 PM WAT

## Flagship Pages
- [Home — Nexus Finance LTD](${SITE_URL}/): Overview, live loan calculator, and fast-track application
- [IPPIS Loans in Nigeria for Federal Civil Servants](${SITE_URL}/ippis-loans-nigeria): No-collateral IPPIS & Remita salary loans up to ₦5,000,000 with same-day disbursement and WACS-compliant deductions
- [About Nexus Finance LTD](${SITE_URL}/about): Institutional mandate, Abuja HQ, and executive leadership
- [Loan & IPPIS Guides Blog](${SITE_URL}/blog): In-depth guides on IPPIS loans, Car-for-Cash, and Travel Proof of Funds
- [Careers](${SITE_URL}/careers): Open positions in Abuja

## Loan & Credit Facilities
${productLines}

## Extended Knowledge Base
- [Full Machine-Readable Knowledge Base](${SITE_URL}/llms-full.txt)
`;
}

function generateLlmsFullTxt(): string {
  const products = NEXUS_PRODUCTS.map(
    (p) => `### ${p.name}
- URL: ${SITE_URL}/loans/${p.id}
- Category: ${p.badge}
- Maximum Limit: ${p.maxAmount}
- Turnaround: ${p.turnaroundTime}
- Tenure: ${p.tenure}
- Rate Info: ${p.rateInfo}
- Summary: ${p.description}
- Requirements: ${p.requirements.join('; ')}
- Key Benefit: ${p.keyBenefit}`
  ).join('\n\n');

  const faqs = [...IPPIS_FAQS, ...HOME_FAQS]
    .map((f) => `**Q: ${f.question}**\nA: ${f.answer}`)
    .join('\n\n');

  const leaders = LEADERSHIP_TEAM.map((l) => `- **${l.name}** — ${l.role}: ${l.bio}`).join('\n');

  return `# Nexus Finance LTD — Complete Knowledge Base (llms-full.txt)

## Brand Identity & Disambiguation
- Legal Name: Nexus Finance LTD (also searched as "Nexus Finance" or "Nexus Finance Nigeria")
- Official Domain: ${SITE_URL}
- Disambiguation: Nexus Finance LTD is headquartered in Central Business District (CBD), Abuja, Nigeria, and is NOT affiliated with Lagos-based NexusRise Finance.
- Address: 2nd Floor, Right Wing, NICON Insurance Building, Central Business District (CBD), Abuja, FCT, Nigeria
- Phone: +234 809 121 2224
- Email: support@nexusfinanceltd.com

## Loan & Liquidity Facilities
${products}

## Frequently Asked Questions (IPPIS, Car-for-Cash & Brand)
${faqs}

## Executive Leadership
${leaders}
`;
}

function main() {
  const rootIndexPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(rootIndexPath)) {
    throw new Error('dist/index.html not found. Run `vite build` before generate-seo.ts.');
  }

  const templateHtml = fs.readFileSync(rootIndexPath, 'utf-8');

  const sitemapRoutes: { path: string; priority: string; changefreq: string }[] = [];

  const writePrerenderedRoute = (
    routePath: string,
    seo: RouteSeoData,
    bodyHtml: string,
    priority: string,
    changefreq: string
  ) => {
    const cleanPath = routePath === '/' ? '/' : routePath.replace(/\/+$/, '');
    const depth = cleanPath === '/' ? 0 : cleanPath.split('/').filter(Boolean).length;
    const html = renderRouteHtml(templateHtml, seo, bodyHtml, depth);

    if (cleanPath === '/') {
      fs.writeFileSync(rootIndexPath, html, 'utf-8');
    } else {
      const targetDir = path.join(DIST_DIR, cleanPath.replace(/^\//, ''));
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf-8');
    }

    sitemapRoutes.push({ path: cleanPath, priority, changefreq });
  };

  // 1. Home
  writePrerenderedRoute('/', getRouteSeo('home'), buildHomeBodyHtml(), '1.0', 'weekly');

  // 2. Flagship IPPIS Pillar
  writePrerenderedRoute(
    '/ippis-loans-nigeria',
    getRouteSeo('ippis-loans'),
    buildIppisBodyHtml(),
    '0.95',
    'weekly'
  );

  // 3. Individual Loan Product Pages
  for (const product of NEXUS_PRODUCTS) {
    const priority =
      product.id === 'car-for-cash' || product.id === 'nexus-credit' || product.id === 'suremoney-loan'
        ? '0.9'
        : '0.8';
    writePrerenderedRoute(
      `/loans/${product.id}`,
      getRouteSeo('product-detail', product.id),
      buildProductBodyHtml(product.id),
      priority,
      'monthly'
    );
  }

  // 4. About, Careers, Gallery, Blog Index
  writePrerenderedRoute('/about', getRouteSeo('about'), buildAboutBodyHtml(), '0.85', 'monthly');
  writePrerenderedRoute('/blog', getRouteSeo('blog'), buildBlogIndexBodyHtml(), '0.85', 'weekly');
  writePrerenderedRoute(
    '/careers',
    getRouteSeo('careers'),
    `<main>${buildNavHtml('../')}<h1>Careers at Nexus Finance LTD (Abuja, Nigeria)</h1><p>Explore career opportunities at Nexus Finance LTD headquarters in Central Business District, Abuja.</p></main>`,
    '0.7',
    'weekly'
  );
  writePrerenderedRoute(
    '/gallery',
    getRouteSeo('gallery'),
    `<main>${buildNavHtml('../')}<h1>Nexus Finance LTD Institutional Gallery</h1><p>Visual archive of Nexus Finance LTD operations, leadership, and corporate milestones in Abuja, Nigeria.</p></main>`,
    '0.6',
    'monthly'
  );

  // 5. Individual Blog Article Pages
  for (const post of INITIAL_BLOG_POSTS) {
    const slug = post.slug || post.id;
    writePrerenderedRoute(
      `/blog/${slug}`,
      getRouteSeo('blog', slug),
      buildBlogPostBodyHtml(slug),
      '0.8',
      'monthly'
    );
  }

  // 6. Write robots.txt, sitemap.xml, llms.txt, llms-full.txt, and GitHub Pages 404.html fallback
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), generateRobotsTxt(), 'utf-8');
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), generateSitemapXml(sitemapRoutes), 'utf-8');
  fs.writeFileSync(path.join(DIST_DIR, 'llms.txt'), generateLlmsTxt(), 'utf-8');
  fs.writeFileSync(path.join(DIST_DIR, 'llms-full.txt'), generateLlmsFullTxt(), 'utf-8');
  fs.writeFileSync(path.join(DIST_DIR, '404.html'), fs.readFileSync(rootIndexPath, 'utf-8'), 'utf-8');

  console.log(
    `[SEO Generator] Prerendered ${sitemapRoutes.length} routes + generated robots.txt, sitemap.xml, llms.txt, llms-full.txt, and 404.html.`
  );
}

main();
