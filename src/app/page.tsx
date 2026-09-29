import App from '../App';
import { SiteDataProvider } from '../context/SiteDataContext';
import { loadSiteData } from '@backend/lib/siteData';

// Catalog and content come from the live data store on every request, so admin edits show immediately.
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <SiteDataProvider initialData={loadSiteData()}>
      <App />
    </SiteDataProvider>
  );
}
