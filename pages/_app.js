// pages/_app.js — Core App & Google Analytics Optimization
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Script from 'next/script'; // Next.js kurumsal script optimizasyonu

const GA_ID = 'G-5GKNTT4ZKG';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // Sayfa değişimlerini (Routing) Google Analytics'e bildir
  useEffect(() => {
    const handleRoute = (url) => {
      if (typeof window.gtag === 'function') {
        window.gtag('config', GA_ID, { page_path: url });
      }
    };

    router.events.on('routeChangeComplete', handleRoute);
    return () => router.events.off('routeChangeComplete', handleRoute);
  }, [router.events]);

  return (
    <>
      {/* 1. Global Site Tag (gtag.js) - Ana script (Sayfa çizildikten sonra yüklenir) */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      
      {/* 2. Google Analytics Yapılandırması */}
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />

      <Component {...pageProps} />
    </>
  );
}
