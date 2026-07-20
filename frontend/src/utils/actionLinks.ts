export const buildGoogleUrl = (query: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(query)}`;

export const locScore = (item: any, dist: string, state: string) => {
  let s = 0;
  const d = (item.district || item.city || item.location || '').toLowerCase();
  const st = (item.state || '').toLowerCase();
  if (dist && (d.includes(dist) || d.includes(dist.split(' ')[0]))) s += 5;
  if (state && st.includes(state.split('/')[0].trim())) s += 2;
  return s;
};

export const kwScore = (item: any, fields: string[], keywords: string[]) => {
  let s = 0;
  const haystack = fields.map(f => (item[f] || '').toLowerCase()).join(' ');
  for (const w of keywords) { if (w.length > 2 && haystack.includes(w)) s += 3; }
  return s;
};

export const matchItems = (list: any[], kwFields: string[], kws: string[], dist: string, state: string, n = 3) =>
  (Array.isArray(list) ? list : []).map(i => ({ i, s: kwScore(i, kwFields, kws) + locScore(i, dist, state) }))
    .filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, n).map(x => x.i);

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
  const msg = (parsed.message || notif.description || '').toLowerCase();
  const occ = scoringData?.occupation || '';
  const dist = (scoringData?.district || '').toLowerCase();
  const state = scoringData?.state || '';
  const loc = [scoringData?.district, state.split('/')[0]?.trim()].filter(Boolean).join(', ');
  
  let kws = occ.toLowerCase().split(/[\s,]+/).filter(Boolean);
  if (kws.length === 0 || occ.toLowerCase().includes('not applicable')) {
    // Fallback to extracting keywords from title
    kws = title.split(/[\s,]+/).filter((w: string) => !['new', 'job', 'alert', 'alert!', 'update', 'opportunities'].includes(w));
  }

  // ── EMPLOYMENT ───────────────────────────────────────────────────────────
  if (cat.includes('EMPLOY') || cat.includes('JOB') || title.includes('job') || msg.includes('job')) {
    const matched = matchItems(jobs, ['job_role_position','job_category','job_subcategory','occupation'], kws, dist, state, 1);
    return {
      type: 'job', label: 'Matched Jobs', icon: 'work',
      items: matched.map(j => ({
        title: j.job_role_position || 'Job Opening',
        sub: j.name_of_company_person || '',
        badge: j.job_type || 'VACANCY',
        meta: [`${j.district || j.city || ''}${j.state ? ', '+j.state : ''}`, j.salary_range, j.exp_required ? `Exp: ${j.exp_required}` : ''].filter(Boolean),
        url: j.job_url || (j.job_contact_email ? `mailto:${j.job_contact_email}` : null),
        btnLabel: 'Apply Now'
      })),
      fallbacks: [
        { label: `Search "${occ} jobs ${loc}" on Google Jobs`, url: `https://www.google.com/search?q=${encodeURIComponent(`${occ} jobs ${loc}`)}&ibp=htl;jobs`, color: 'bg-[#4285F4] text-white' },
        { label: 'Search on NCS Portal (Govt. Job Board)', url: `https://www.ncs.gov.in/Pages/Search.aspx?searchText=${encodeURIComponent(occ)}&location=${encodeURIComponent(loc)}`, color: 'bg-primary/10 border border-primary/30 text-primary' },
      ],
      moreLabel: `Find more "${occ}" jobs`, moreUrl: buildGoogleUrl(`${occ} jobs ${loc}`)
    };
  }

  // ── HEALTHCARE ───────────────────────────────────────────────────────────
  if (cat.includes('HEALTH') || cat.includes('MEDIC') || title.includes('health') || title.includes('hospital') || msg.includes('hospital')) {
    const matched = matchItems(medicalFacilities, ['facility_name','facility_type','specialization'], ['hospital','clinic','health','medical','primary'], dist, state, 1);
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

  // ── SCHEMES ──────────────────────────────────────────────────────────────
  if (cat.includes('SCHEME') || cat.includes('BENEFIT') || cat.includes('WELFARE') || title.includes('scheme') || msg.includes('scheme') || msg.includes('yojana')) {
    const schemeKws = [...kws, 'scheme', 'yojana', 'benefit'];
    const matched = matchItems(schemes, ['scheme_name','title','scheme_category','agency','description'], schemeKws, dist, state, 1);
    return {
      type: 'scheme', label: 'Matching Schemes', icon: 'policy',
      items: matched.map(s => ({
        title: s.scheme_name || s.title || 'Government Scheme',
        sub: s.scheme_category || s.agency || '',
        badge: s.scheme_type || 'SCHEME',
        meta: [s.deadline ? `Deadline: ${s.deadline}` : '', s.benefit_amount || s.benefit_details ? `Benefit: ${s.benefit_amount || s.benefit_details}` : ''].filter(Boolean),
        url: s.application_url || s.official_url || s.portal_link || s.source_url,
        btnLabel: 'Apply for Scheme'
      })),
      fallbacks: [
        { label: `Find schemes for ${occ} on MyScheme`, url: `https://www.myscheme.gov.in/search?q=${encodeURIComponent(occ)}`, color: 'bg-[#1a73e8] text-white' },
        { label: 'PM-KISAN / PM Schemes Portal', url: 'https://pmkisan.gov.in/', color: 'bg-primary/10 border border-primary/30 text-primary' },
      ],
      moreLabel: 'Browse all schemes on MyScheme', moreUrl: 'https://www.myscheme.gov.in/'
    };
  }

  // ── AGRICULTURE ──────────────────────────────────────────────────────────
  if (cat.includes('AGRI') || cat.includes('FARM') || cat.includes('KISAN') || title.includes('farm') || msg.includes('farm') || msg.includes('kisan')) {
    const agriKws = [...kws, 'kisan', 'farmer', 'agriculture', 'krishi', 'crop', 'maan-dhan'];
    const matched = matchItems(schemes, ['scheme_name','title','scheme_category','agency','description','tags'], agriKws, dist, state, 1);
    return {
      type: 'scheme', label: 'Farmer Scheme Update', icon: 'agriculture',
      items: matched.map(s => ({
        title: s.scheme_name || s.title || 'Agriculture Scheme',
        sub: s.scheme_category || s.agency || '',
        badge: s.scheme_type || 'AGRI SCHEME',
        meta: [s.deadline ? `Deadline: ${s.deadline}` : '', s.benefit_amount || s.benefit_details ? `Benefit: ${s.benefit_amount || s.benefit_details}` : ''].filter(Boolean),
        url: s.application_url || s.official_url || s.portal_link || s.source_url,
        btnLabel: 'Claim Farmer Benefit'
      })),
      fallbacks: [
        { label: `PM-KISAN scheme for farmers in ${loc}`, url: 'https://pmkisan.gov.in/', color: 'bg-green-600 text-white' },
        { label: `Agri schemes for ${occ} — MyScheme`, url: `https://www.myscheme.gov.in/search?q=${encodeURIComponent('farmer '+occ)}`, color: 'bg-primary/10 border border-primary/30 text-primary' },
        { label: `Search "${occ} agriculture support ${loc}"`, url: buildGoogleUrl(`${occ} agriculture scheme ${loc}`), color: 'bg-surface border border-outline-variant text-outline' },
      ],
      moreLabel: 'Kisan Call Center: 1800-180-1551', moreUrl: 'tel:18001801551'
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
