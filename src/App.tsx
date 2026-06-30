import { Routes, Route } from 'react-router-dom'
import { MapPage } from './pages/MapPage'
import { LocationPage } from './pages/LocationPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MapPage />} />
      <Route path="/place/:id" element={<LocationPage />} />
    </Routes>
  )
}
