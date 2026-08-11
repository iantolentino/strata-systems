export const sites = [
  ['strata-home', 'Strata Staff Global', 'https://stratastaffglobal.com/'],
  ['trackdev', 'TrackDev', 'https://dev.stratastaff.com/board'],
  ['escalations', 'Escalations', 'https://escalations.stratastaffglobal.com/'],
  ['newsletter', 'Newsletter Analytics', 'https://newsletter-analytics.stratastaff.com/'],
  ['cng-tickets', 'CNG Tickets', 'https://cng-tickets.stratastaff.com/login.php'],
  ['client-feedback', 'Client Feedback', 'https://clients-feedback.stratastaff.com/feedback.php'],
  ['scorecard', 'Strata Capacity Test', 'https://stratastaffglobal.com/scorecard/'],
  ['icp-access', 'ICP Access', 'https://stratastaffglobal.com/icp/icp-login.php'],
  ['srf-login', 'Staff Login (SRF)', 'https://stratastaff.com/srf/admin/login.php'],
  ['signatures', 'Email Signature Generator', 'https://onboarding.stratastaffglobal.com/banner/stratastaff/'],
  ['strata-systems', 'Strata Systems Dashboard', 'https://strata-staff-systems.vercel.app/'],
  ['grafana-private', 'GRAFANA Monitoring Servers', 'http://172.16.1.243:3000/', 'private']
].map(([id, name, url, group = 'internal']) => ({ id, name, url, group }));
