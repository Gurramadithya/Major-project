import { Link } from 'react-router-dom';
import PageContainer from '../components/PageContainer';

const NotFound = () => (
  <PageContainer title="Page Not Found" subtitle="The requested route could not be found.">
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center">
      <p className="text-lg text-white">This page is not available in the current dashboard view.</p>
      <Link to="/" className="mt-4 inline-flex rounded-full bg-medical-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-medical-700">
        Return Home
      </Link>
    </div>
  </PageContainer>
);

export default NotFound;
