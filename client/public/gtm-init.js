// Google Tag Manager + GA4 initialization — gated behind cookie consent.
// Defines window.__loadAurelleAnalytics(), which the consent banner calls
// once the visitor accepts, or which runs immediately here if a previous
// visit already recorded acceptance. Nothing loads before that.
window.__loadAurelleAnalytics = function () {
  if (window.__aurelleAnalyticsLoaded) return;
  window.__aurelleAnalyticsLoaded = true;

  // GA4 gtag.js
  var gtagScript = document.createElement("script");
  gtagScript.async = true;
  gtagScript.src = "https://www.googletagmanager.com/gtag/js?id=G-MFMB4BM30N";
  document.head.appendChild(gtagScript);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", "G-MFMB4BM30N");

  // GTM container
  (function (w, d, s, l, i) {
    w[l] = w[l] || [];
    w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    var f = d.getElementsByTagName(s)[0],
      j = d.createElement(s),
      dl = l != "dataLayer" ? "&l=" + l : "";
    j.async = true;
    j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
    f.parentNode.insertBefore(j, f);
  })(window, document, "script", "dataLayer", "GTM-PWHFHFS8");
};

try {
  if (localStorage.getItem("aurelle-cookie-consent") === "accepted") {
    window.__loadAurelleAnalytics();
  }
} catch (e) {
  // localStorage unavailable (private mode, blocked storage) — stay opted out.
}
