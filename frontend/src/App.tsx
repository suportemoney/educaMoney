import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { PrivacidadePage } from "./pages/PrivacidadePage";
import { RegisterPage } from "./pages/RegisterPage";
import { TermosPage } from "./pages/TermosPage";
import { ValidarCertificadoPage } from "./pages/ValidarCertificadoPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route path="/validar-certificado" element={<ValidarCertificadoPage />} />
          <Route path="/termos" element={<TermosPage />} />
          <Route path="/privacidade" element={<PrivacidadePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
