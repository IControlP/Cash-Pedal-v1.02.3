import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import TCOCalculator from './pages/TCOCalculator'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/tco" element={<TCOCalculator />} />
      </Routes>
    </BrowserRouter>
  )
}
