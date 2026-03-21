import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import TCOCalculator from './pages/TCOCalculator'
import CarSurvey from './pages/CarSurvey'
import SalaryCalculator from './pages/SalaryCalculator'
import MultiVehicleComparison from './pages/MultiVehicleComparison'
import CarBuyingChecklist from './pages/CarBuyingChecklist'
import WheelZard from './pages/WheelZard'
import Resources from './pages/Resources'
import About from './pages/About'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/tco" element={<TCOCalculator />} />
        <Route path="/survey" element={<CarSurvey />} />
        <Route path="/salary" element={<SalaryCalculator />} />
        <Route path="/compare" element={<MultiVehicleComparison />} />
        <Route path="/checklist" element={<CarBuyingChecklist />} />
        <Route path="/wheelzard" element={<WheelZard />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  )
}
