/**
 * ARES Frontend App
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import IngestSite from './pages/IngestSite';
import ResolveActor from './pages/ResolveActor';
import ClusterDetails from './pages/ClusterDetails';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="ingest" element={<IngestSite />} />
          <Route path="resolve" element={<ResolveActor />} />
          <Route path="clusters/:id" element={<ClusterDetails />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
