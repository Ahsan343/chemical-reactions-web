import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ResponsiveLayout } from './layout/ResponsiveLayout';
import Home from './pages/Home/Home';
import BalancedReactionScreen from './pages/BalancedReactionScreen/BalancedReactionScreen';
import LimitingReagentScreen from './pages/LimitingReagentScreen/LimitingReagentScreen';
import PrecipitationScreen from './pages/PrecipitationScreen/PrecipitationScreen';
import FilingCabinet from './pages/FilingCabinet/FilingCabinet';

function App() {
  return (
    <BrowserRouter>
      <ResponsiveLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/balanced" element={<BalancedReactionScreen />} />
          <Route path="/limiting" element={<LimitingReagentScreen />} />
          <Route path="/precipitation" element={<PrecipitationScreen />} />
          <Route path="/filing-cabinet/:subunit" element={<FilingCabinet />} />
        </Routes>
      </ResponsiveLayout>
    </BrowserRouter>
  );
}

export default App;
