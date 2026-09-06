import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { DocsLayout } from './components/layout/DocsLayout';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { ChoujinDocs } from './pages/docs/ChoujinDocs';
import { FactionDocs } from './pages/docs/FactionDocs';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/docs" element={<DocsLayout />}>
            <Route index element={<Navigate to="/docs/choujin" replace />} />
            <Route path="choujin" element={<ChoujinDocs />} />
            <Route path="faction" element={<FactionDocs />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
