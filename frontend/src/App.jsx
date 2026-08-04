import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Upload from './pages/Upload';
import Detection from './pages/Detection';
import Viewer from './pages/Viewer';
import Assistant from './pages/Assistant';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import CaseHistory from './pages/CaseHistory';
import MedicalLibrary from './pages/MedicalLibrary';
import NotFound from './pages/NotFound';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-8">
        <Sidebar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/detection" element={<Detection />} />
            <Route path="/viewer" element={<Viewer />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/history" element={<CaseHistory />} />
            <Route path="/library" element={<MedicalLibrary />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default App;
