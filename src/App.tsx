import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Practice from './pages/Practice';
import Blocks from './pages/Blocks';
import Study from './pages/Study';
import Simulacro from './pages/Simulacro';
import Stats from './pages/Stats';
import Plan from './pages/Plan';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="practica" element={<Practice />} />
        <Route path="bloques" element={<Blocks />} />
        <Route path="aprender/:blockId" element={<Study />} />
        <Route path="simulacro" element={<Simulacro />} />
        <Route path="stats" element={<Stats />} />
        <Route path="plan" element={<Plan />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
