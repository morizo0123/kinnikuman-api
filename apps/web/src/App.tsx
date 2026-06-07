import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Docs } from './pages/Docs';

function App() {
  return (
    <BrowserRouter>
      {/* ヘッダー */}
      <header className="border-b">
        <Link to="/" className="font-bold hover:underline">
          🦸 KinnikumanAPI
        </Link>
        <div className="flex gap-4 ml-auto">
          <Link to="/" className="hover:underline">
            Home
          </Link>
          <Link to="/docs" className="hover:underline">
            Docs
          </Link>
          <Link to="/about" className="hover:underline">
            About
          </Link>
        </div>
      </header>

      {/* ページ本体 */}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/docs" element={<Docs />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
