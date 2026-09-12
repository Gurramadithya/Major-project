import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import Dashboard from '../pages/Dashboard';
import Assistant from '../pages/Assistant';
import Reports from '../pages/Reports';
import CaseHistory from '../pages/CaseHistory';
import MedicalLibrary from '../pages/MedicalLibrary';
import NotFound from '../pages/NotFound';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'assistant',
        element: <Assistant />,
      },
      {
        path: 'reports',
        element: <Reports />,
      },
      {
        path: 'history',
        element: <CaseHistory />,
      },
      {
        path: 'library',
        element: <MedicalLibrary />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);

export default router;
