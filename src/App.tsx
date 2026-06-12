import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import CompanyDetail from './pages/CompanyDetail';
import Contacts from './pages/Contacts';
import ContactDetail from './pages/ContactDetail';
import Leads from './pages/Leads';
import Forms from './pages/Forms';
import Settings from './pages/Settings';
import FormEmbed from './pages/FormEmbed';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/embed/:formId" element={<FormEmbed />} />

        {/* Authenticated app — auth bypassed for deployment testing */}
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/companies/:id" element={<CompanyDetail />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/contacts/:id" element={<ContactDetail />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/leads/:id" element={<Leads />} />
          <Route path="/forms" element={<Forms />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
