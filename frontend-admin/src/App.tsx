import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./components/AdminLayout";
import { RequireAuth } from "./components/RequireAuth";
import { AuthProvider } from "./context/AuthContext";
import { CursosPage } from "./pages/CursosPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { PlanosPage } from "./pages/PlanosPage";
import { IntegracaoPage } from "./pages/IntegracaoPage";
import { TokensPage } from "./pages/TokensPage";
import { UsuariosPage } from "./pages/UsuariosPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/painel">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="usuarios" element={<UsuariosPage />} />
              <Route path="planos" element={<PlanosPage />} />
              <Route path="integracao" element={<IntegracaoPage />} />
              <Route path="cursos" element={<CursosPage />} />
              <Route path="tokens" element={<TokensPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
