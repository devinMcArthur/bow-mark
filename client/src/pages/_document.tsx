import Document, { Html, Head, Main, NextScript } from "next/document";

export default class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          {/*
            PWA cache rescue — runs before any bundle loads, so it can
            unstick users whose installed PWA is serving stale cached HTML
            or an old service worker that doesn't reflect a shipped fix.
            Bump PWA_VERSION to force every client (Safari tab or
            home-screen PWA) to unregister its service worker, clear all
            Cache Storage, and reload into the fresh build on next page
            load. Users see at most one extra reload, no manual action.
          */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
(function () {
  try {
    var PWA_VERSION = "2026-04-15-standalone-fix";
    if (localStorage.getItem("pwaVersion") === PWA_VERSION) return;
    localStorage.setItem("pwaVersion", PWA_VERSION);
    var didWork = false;
    var finish = function () {
      if (didWork) window.location.reload();
    };
    var clearCaches = function () {
      if (!window.caches) return finish();
      caches.keys().then(function (ks) {
        if (ks.length === 0) return finish();
        didWork = true;
        Promise.all(ks.map(function (k) { return caches.delete(k); })).then(finish, finish);
      }, finish);
    };
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (rs) {
        if (rs.length === 0) return clearCaches();
        didWork = true;
        Promise.all(rs.map(function (r) { return r.unregister(); })).then(clearCaches, clearCaches);
      }, clearCaches);
    } else {
      clearCaches();
    }
  } catch (e) {}
})();
              `.trim(),
            }}
          />
          <meta charSet="utf-8" />
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta name="description" content="Bow Mark Web Application" />
          <meta name="keywords" content="Keywords" />

          <link rel="manifest" href="/manifest.json" />
          <link
            href="/icons/favicon-16x16.png"
            rel="icon"
            type="image/png"
            sizes="16x16"
          />
          <link
            href="/icons/favicon-32x32.png"
            rel="icon"
            type="image/png"
            sizes="32x32"
          />
          <link rel="apple-touch-icon" href="/icons/apple-icon.png"></link>
          <meta name="theme-color" content="#ef2e25" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta
            name="apple-mobile-web-app-title"
            content={`Bow Mark${process.env.NEXT_PUBLIC_APP_NAME ? ` ${process.env.NEXT_PUBLIC_APP_NAME}` : ""}`}
          />

          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_ANALYTICS_ID}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_ANALYTICS_ID}', {
              page_path: window.location.pathname,
            });
          `,
            }}
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
