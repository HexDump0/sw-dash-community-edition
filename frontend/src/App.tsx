import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/AuthProvider';
import { QueuePage } from './pages/QueuePage';
import { ReviewPage } from './pages/ReviewPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<QueuePage />} />
          <Route path="/review/:id" element={<ReviewPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App
