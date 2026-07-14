import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { AuthProvider } from "./context/AuthContext";
import { AtivarPage } from "./pages/AtivarPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { MeusCursosPage } from "./pages/MeusCursosPage";
import { RegisterPage } from "./pages/RegisterPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/ativar" element={<AtivarPage />} />
            <Route path="/meus-cursos" element={<MeusCursosPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
