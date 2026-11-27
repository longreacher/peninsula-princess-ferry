import { ANALYTICS_CONFIG } from './analytics-config.js';

const GOATCOUNTER_ENDPOINT = /^https:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.goatcounter\.com\/count$/i;
const isPublicWebPage = location.protocol === 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
const privacyOptOut = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';

function startPrivacyFriendlyAnalytics() {
  const endpoint = ANALYTICS_CONFIG.endpoint.trim();
  if (!isPublicWebPage || privacyOptOut || !GOATCOUNTER_ENDPOINT.test(endpoint)) return;

  // Send one fixed aggregate page name only. This deliberately excludes the
  // URL query string, referrer, GPS position, route, and all app state.
  window.goatcounter = {
    path: ANALYTICS_CONFIG.pagePath,
    title: ANALYTICS_CONFIG.pageTitle,
    referrer: '',
    no_events: true
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://gc.zgo.at/count.js';
  script.dataset.goatcounter = endpoint;
  script.dataset.goatcounterSettings = JSON.stringify({
    path: ANALYTICS_CONFIG.pagePath,
    title: ANALYTICS_CONFIG.pageTitle,
    referrer: '',
    no_events: true
  });
  script.referrerPolicy = 'no-referrer';
  document.head.appendChild(script);
}

startPrivacyFriendlyAnalytics();
