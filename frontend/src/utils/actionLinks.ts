export const buildGoogleUrl = (query: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(query)}`;

export const locScore = (item: any, dist: string, state: string) => {
  let s = 0;
  const d = (item.district || item.city || item.location || '').toLowerCase();
  const st = (item.state || '').toLowerCase();
  if (dist && (d.includes(dist) || d.includes(dist.split(' ')[0]))) s += 5;
  const stClean = (state || '').split('/')[0].trim().toLowerCase();
  if (stClean && (st.includes(stClean) || st === 'all' || st === 'central' || st === 'india' || !st)) s += 2;
  return s;
};

export const kwScore = (item: any, fields: string[], keywords: string[], title = '', msg = '') => {
  let s = 0;
  const name = (item.scheme_name || item.title || item.job_role_position || item.facility_name || item.service_name || '').toLowerCase();
  const slug = (item.slug || '').toLowerCase();
  const haystack = fields.map(f => (item[f] || '').toLowerCase()).join(' ');

  // Direct match bonuses (100 pts for exact text or acronym presence)
  if (name.length > 3 && (title.includes(name) || msg.includes(name))) {
    s += 100;
  }
  const cleanName = name.replace(/\s*\([^)]*\)/g, '').trim();
  if (cleanName.length > 3 && (title.includes(cleanName) || msg.includes(cleanName))) {
    s += 100;
  }
  // Name token overlap bonus
  const nameTokens = cleanName.split(/\s+/).filter((w: string) => w.length > 2);
  if (nameTokens.length > 0) {
    let matchedTokens = 0;
    for (const t of nameTokens) {
      if (title.includes(t) || msg.includes(t)) matchedTokens++;
    }
    if (matchedTokens / nameTokens.length >= 0.5) s += 40;
  }

  if (slug.length > 2 && (title.includes(slug) || msg.includes(slug))) {
    s += 100;
  }
  const acronymMatch = name.match(/\(([^)]+)\)/);
  if (acronymMatch && acronymMatch[1]) {
    const acro = acronymMatch[1].toLowerCase();
    if (acro.length >= 2 && (title.includes(acro) || msg.includes(acro))) {
      s += 100;
    }
  }

  for (const w of keywords) {
    if (w.length > 2 && (haystack.includes(w) || name.includes(w))) s += 3;
  }
  return s;
};

export const matchItems = (list: any[], kwFields: string[], kws: string[], dist: string, state: string, n = 3, title = '', msg = '') =>
  (Array.isArray(list) ? list : []).map(i => ({ i, s: kwScore(i, kwFields, kws, title, msg) + locScore(i, dist, state) }))
    .filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, n).map(x => x.i);

export const getMySchemeUrl = (s: any) => {
  const titleStr = (s.scheme_name || s.title || '').toLowerCase();
  
  // High-priority exact scheme slug overrides to guarantee no 404s
  if (titleStr.includes('pm-kmy') || titleStr.includes('pmkmy') || titleStr.includes('kisan maan-dhan') || titleStr.includes('maan-dhan yojana')) {
    return 'https://www.myscheme.gov.in/schemes/pmkmy';
  }
  if (titleStr.includes('pm-kisan') || titleStr.includes('kisan samman nidhi')) {
    return 'https://www.myscheme.gov.in/schemes/pm-kisan';
  }
  if (titleStr.includes('pmfby') || titleStr.includes('fasal bima')) {
    return 'https://www.myscheme.gov.in/schemes/pmfby';
  }
  if (titleStr.includes('kcc') || titleStr.includes('kisan credit card')) {
    return 'https://www.myscheme.gov.in/schemes/kcc';
  }
  if (titleStr.includes('pmay') || titleStr.includes('awas yojana')) {
    return 'https://www.myscheme.gov.in/schemes/pmay-u';
  }
  if (titleStr.includes('pm-jay') || titleStr.includes('ayushman') || titleStr.includes('jan arogya')) {
    return 'https://www.myscheme.gov.in/schemes/pm-jay';
  }
  if (titleStr.includes('mudra') || titleStr.includes('pmmy')) {
    return 'https://www.myscheme.gov.in/schemes/pmmy';
  }

  let url = '';
  if (s.slug) {
    url = `https://www.myscheme.gov.in/schemes/${s.slug}`;
  } else if (s.official_url && s.official_url.includes('myscheme.gov.in')) {
    url = s.official_url;
  } else if (s.application_url && s.application_url.includes('myscheme.gov.in')) {
    url = s.application_url;
  } else if (s.source_url && s.source_url.includes('myscheme.gov.in')) {
    url = s.source_url;
  } else if (s.official_url) {
    url = s.official_url;
  } else if (s.application_url) {
    url = s.application_url;
  }
  
  if (url) {
    return url.replace(/\/schemes\/pm-kmy\b/gi, '/schemes/pmkmy');
  }

  const cleanTitle = titleStr.replace(/\s*\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return cleanTitle ? `https://www.myscheme.gov.in/schemes/${cleanTitle}` : 'https://www.myscheme.gov.in/';
};

export const ensureSchemeMatch = (matched: any[], title: string, msg: string) => {
  if (matched.length > 0) return matched;
  
  const text = (title + ' ' + msg).toLowerCase();
  if (text.includes('pm-kmy') || text.includes('pmkmy') || text.includes('kisan maan-dhan') || text.includes('maan-dhan yojana')) {
    return [{ title: 'PM Kisan Maan-Dhan Yojana (PM-KMY)', scheme_category: 'Pension & Social Security', agency: 'Ministry of Agriculture and Farmers Welfare', benefit_amount: 'Rs 3,000 per month pension', slug: 'pmkmy', official_url: 'https://www.myscheme.gov.in/schemes/pmkmy' }];
  }
  if (text.includes('pm-kisan') || text.includes('kisan samman nidhi')) {
    return [{ title: 'PM Kisan Samman Nidhi (PM-KISAN)', scheme_category: 'Agriculture & Farmer Welfare', agency: 'Ministry of Agriculture and Farmers Welfare', benefit_amount: 'Rs 6,000 per year', slug: 'pm-kisan' }];
  }
  if (text.includes('pmfby') || text.includes('fasal bima')) {
    return [{ title: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)', scheme_category: 'Crop Insurance', agency: 'Ministry of Agriculture', benefit_amount: 'Comprehensive Crop Insurance', slug: 'pmfby' }];
  }
  if (text.includes('kcc') || text.includes('kisan credit card')) {
    return [{ title: 'Kisan Credit Card (KCC)', scheme_category: 'Agriculture Credit', agency: 'Ministry of Agriculture', benefit_amount: 'Subsidized Agriculture Loans', slug: 'kcc' }];
  }
  if (text.includes('pmay') || text.includes('awas yojana')) {
    return [{ title: 'Pradhan Mantri Awas Yojana (PMAY)', scheme_category: 'Housing & Urban Poverty', agency: 'Ministry of Housing and Urban Affairs', slug: 'pmay' }];
  }
  if (text.includes('pm-jay') || text.includes('ayushman') || text.includes('jan arogya')) {
    return [{ title: 'Ayushman Bharat PM-JAY', scheme_category: 'Healthcare Insurance', agency: 'National Health Authority', benefit_amount: 'Rs 5 Lakh Cover per family/yr', slug: 'pm-jay' }];
  }
  if (text.includes('mudra') || text.includes('pmmy')) {
    return [{ title: 'Pradhan Mantri Mudra Yojana (PMMY)', scheme_category: 'MSME Loans', agency: 'Ministry of Finance', slug: 'pmmy' }];
  }
  return matched;
};

export const getActionLinks = (
  notif: any, 
  parsed: any, 
  scoringData: any,
  inventories: { jobs?: any[], schemes?: any[], services?: any[], medicalFacilities?: any[] }
) => {
  const jobs = inventories.jobs || [];
  const schemes = inventories.schemes || [];
  const services = inventories.services || [];
  const medicalFacilities = inventories.medicalFacilities || [];
  
  const cat = (notif.category || '').toUpperCase();
  const title = (parsed.title || notif.title || '').toLowerCase();
  const msg = (parsed.message || parsed.personalized_content || parsed.description || parsed.body || notif.personalized_content || notif.description || notif.body || '').toLowerCase();
  const rawOcc = scoringData?.occupation || scoringData?.Occupation || scoringData?.job_role || '';
  const occ = rawOcc.toLowerCase().includes('not applicable') ? '' : rawOcc;
  const dist = (scoringData?.district || scoringData?.District || '').toLowerCase();
  const state = (scoringData?.state || scoringData?.State || '').toLowerCase();
  const loc = [scoringData?.district || scoringData?.District, (state.split('/')[0] || '').trim()].filter(Boolean).join(', ');

  const occLabel = occ || 'relevant';
  const locLabel = loc || 'your area';
  
  let kws = occ ? occ.toLowerCase().split(/[\s,]+/).filter(Boolean) : [];
  const textTokens = (title + ' ' + msg).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !['new', 'job', 'alert', 'alert!', 'update', 'opportunities', 'eligible', 'claim', 'free', 'benefits', 'apply'].includes(w));
  kws = Array.from(new Set([...kws, ...textTokens]));

  // ── EMPLOYMENT ───────────────────────────────────────────────────────────
  if (cat.includes('EMPLOY') || cat.includes('JOB') || title.includes('job') || msg.includes('job') || msg.includes('carpenter') || msg.includes('consultant')) {
    const matched = matchItems(jobs, ['job_role_position','job_category','job_subcategory','occupation'], kws, dist, state, 1, title, msg);
    
    // Extract job title and location from matched job or notification text for precise search URLs
    const matchedJob = matched[0];
    const jobRoleName = matchedJob?.job_role_position || matchedJob?.occupation || (msg.includes('carpenter') ? 'Carpenter' : (msg.includes('data entry') ? 'Data Entry Operator' : (occ || 'jobs')));
    const jobLocName = matchedJob?.district || matchedJob?.city || matchedJob?.state || dist || loc || 'Thane';
    const ncsSearchUrl = `https://www.ncs.gov.in/Pages/Search.aspx?searchText=${encodeURIComponent(jobRoleName)}&location=${encodeURIComponent(jobLocName)}`;

    return {
      type: 'job', label: 'Matched Jobs', icon: 'work',
      items: matched.map(j => ({
        title: j.job_role_position || 'Job Opening',
        sub: j.name_of_company_person || '',
        badge: j.job_type || 'VACANCY',
        meta: [`${j.district || j.city || ''}${j.state ? ', '+j.state : ''}`, j.salary_range, j.exp_required ? `Exp: ${j.exp_required}` : ''].filter(Boolean),
        url: j.job_url || j.official_url || (j.job_contact_email ? `mailto:${j.job_contact_email}` : ncsSearchUrl),
        btnLabel: 'Apply Now'
      })),
      fallbacks: [
        { label: `Search "${jobRoleName} opportunities in ${jobLocName}" on Google Jobs`, url: `https://www.google.com/search?q=${encodeURIComponent(`${jobRoleName} jobs ${jobLocName}`)}&ibp=htl;jobs`, color: 'bg-[#4285F4] text-white' },
        { label: 'Search on NCS Portal (Govt. Job Board)', url: ncsSearchUrl, color: 'bg-primary/10 border border-primary/30 text-primary' },
      ],
      moreLabel: `Find more "${jobRoleName}" opportunities`, moreUrl: buildGoogleUrl(`${jobRoleName} job opening ${jobLocName}`)
    };
  }

  // ── AGRICULTURE SCHEMES (Prioritized before generic SCHEMES) ─────────────
  if (cat.includes('AGRI') || cat.includes('FARM') || cat.includes('KISAN') || title.includes('farm') || msg.includes('farm') || msg.includes('kisan') || msg.includes('pm-kisan') || msg.includes('pm-kmy')) {
    const agriKws = [...kws, 'kisan', 'farmer', 'agriculture', 'krishi', 'crop', 'maan-dhan'];
    let matched = matchItems(schemes, ['scheme_name','title','scheme_category','agency','description','tags'], agriKws, dist, state, 1, title, msg);
    matched = ensureSchemeMatch(matched, title, msg);
    return {
      type: 'scheme', label: 'Farmer Scheme Update', icon: 'agriculture',
      items: matched.map(s => ({
        title: s.scheme_name || s.title || 'Agriculture Scheme',
        sub: s.scheme_category || s.agency || s.category_name || s.ministry || '',
        badge: s.scheme_type || 'AGRI SCHEME',
        meta: [s.deadline ? `Deadline: ${s.deadline}` : '', s.benefit_amount || s.benefit_details || s.benefits ? `Benefit: ${s.benefit_amount || s.benefit_details || s.benefits}` : ''].filter(Boolean),
        url: getMySchemeUrl(s),
        btnLabel: 'Claim Farmer Benefit'
      })),
      fallbacks: [
        { label: `Agri & Farmer schemes on MyScheme Portal`, url: `https://www.myscheme.gov.in/search?q=${encodeURIComponent('farmer '+occ)}`, color: 'bg-green-600 text-white' },
        { label: `Search "${occLabel} agriculture support ${locLabel}"`, url: buildGoogleUrl(`${occ} agriculture scheme ${loc}`), color: 'bg-surface border border-outline-variant text-outline' },
      ],
      moreLabel: 'Kisan Call Center: 1800-180-1551', moreUrl: 'tel:18001801551'
    };
  }

  // ── GENERAL SCHEMES ──────────────────────────────────────────────────────
  if (cat.includes('SCHEME') || cat.includes('BENEFIT') || cat.includes('WELFARE') || title.includes('scheme') || msg.includes('scheme') || msg.includes('yojana')) {
    const schemeKws = [...kws, 'scheme', 'yojana', 'benefit'];
    let matched = matchItems(schemes, ['scheme_name','title','scheme_category','agency','description'], schemeKws, dist, state, 1, title, msg);
    matched = ensureSchemeMatch(matched, title, msg);
    return {
      type: 'scheme', label: 'Matching Schemes', icon: 'policy',
      items: matched.map(s => ({
        title: s.scheme_name || s.title || 'Government Scheme',
        sub: s.scheme_category || s.agency || s.category_name || s.ministry || '',
        badge: s.scheme_type || 'SCHEME',
        meta: [s.deadline ? `Deadline: ${s.deadline}` : '', s.benefit_amount || s.benefit_details || s.benefits ? `Benefit: ${s.benefit_amount || s.benefit_details || s.benefits}` : ''].filter(Boolean),
        url: getMySchemeUrl(s),
        btnLabel: 'Apply for Scheme'
      })),
      fallbacks: [
        { label: `Find schemes for ${occLabel} on MyScheme`, url: `https://www.myscheme.gov.in/search?q=${encodeURIComponent(occ || 'welfare')}`, color: 'bg-[#1a73e8] text-white' },
        { label: 'PM-KISAN on MyScheme Portal', url: 'https://www.myscheme.gov.in/schemes/pm-kisan', color: 'bg-primary/10 border border-primary/30 text-primary' },
      ],
      moreLabel: 'Browse all schemes on MyScheme', moreUrl: 'https://www.myscheme.gov.in/'
    };
  }

  // ── HEALTHCARE ───────────────────────────────────────────────────────────
  if (cat.includes('HEALTH') || cat.includes('MEDIC') || title.includes('health') || title.includes('hospital') || msg.includes('hospital')) {
    const matched = matchItems(medicalFacilities, ['facility_name','facility_type','specialization'], ['hospital','clinic','health','medical','primary'], dist, state, 1, title, msg);
    return {
      type: 'health', label: 'Nearby Health Facilities', icon: 'local_hospital',
      items: matched.map(f => ({
        title: f.facility_name || 'Health Facility',
        sub: f.facility_type || '',
        badge: f.facility_type || 'CLINIC',
        meta: [`${f.district || f.city || ''}${f.state ? ', '+f.state : ''}`, f.contact_number].filter(Boolean),
        url: f.website || (f.contact_number ? `tel:${f.contact_number}` : null),
        btnLabel: 'Get Directions / Call'
      })),
      fallbacks: [
        { label: `Find hospitals near ${loc} on Google`, url: buildGoogleUrl(`hospitals near ${loc}`), color: 'bg-[#4285F4] text-white' },
        { label: 'Ayushman Bharat Portal', url: 'https://pmjay.gov.in/', color: 'bg-primary/10 border border-primary/30 text-primary' },
      ],
      moreLabel: `Find more health services near ${loc}`, moreUrl: buildGoogleUrl(`primary health center near ${loc}`)
    };
  }

  // ── SERVICE ──────────────────────────────────────────────────────────────
  if (cat.includes('SERVICE') || cat.includes('CIVIC') || title.includes('service') || msg.includes('service')) {
    const matched = matchItems(services, ['service_name','service_category','description'], kws, dist, state, 1);
    return {
      type: 'service', label: 'Nearby Services', icon: 'miscellaneous_services',
      items: matched.map(sv => ({
        title: sv.service_name || 'Civic Service',
        sub: sv.service_category || '',
        badge: 'SERVICE',
        meta: [`${sv.district || sv.city || ''}${sv.state ? ', '+sv.state : ''}`].filter(Boolean),
        url: sv.website || sv.application_url,
        btnLabel: 'Access Service'
      })),
      fallbacks: [
        { label: `Find govt. services near ${loc}`, url: buildGoogleUrl(`government services ${loc}`), color: 'bg-[#4285F4] text-white' },
        { label: 'Umang App — All Govt. Services', url: 'https://web.umang.gov.in/', color: 'bg-primary/10 border border-primary/30 text-primary' },
      ],
      moreLabel: `More services near ${loc}`, moreUrl: buildGoogleUrl(`govt services near ${loc}`)
    };
  }

  // ── ANNOUNCEMENT / GENERAL ───────────────────────────────────────────────
  return {
    type: 'general', label: 'Related Resources', icon: 'info',
    items: [],
    fallbacks: [
      { label: `Search this topic on Google`, url: buildGoogleUrl(`${title} ${loc}`), color: 'bg-[#4285F4] text-white' },
      { label: 'Umang — All Govt. Services', url: 'https://web.umang.gov.in/', color: 'bg-primary/10 border border-primary/30 text-primary' },
    ],
    moreLabel: 'Explore on Google', moreUrl: buildGoogleUrl(`${title} ${loc}`)
  };
};
