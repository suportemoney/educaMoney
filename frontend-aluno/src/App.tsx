import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PortalLayout } from "./components/PortalLayout";
import { RequireAuth } from "./components/RequireAuth";
import { AuthProvider } from "./context/AuthContext";
import { AtivarPage } from "./pages/AtivarPage";
import { AulaPlayerPage } from "./pages/AulaPlayerPage";
import { CatalogoPage } from "./pages/CatalogoPage";
import { ConjuntosPage } from "./pages/ConjuntosPage";
import { CursoDetalhePage } from "./pages/CursoDetalhePage";
import { DashboardPage } from "./pages/DashboardPage";
import { FinancasPage } from "./pages/FinancasPage";
import { LoginPage } from "./pages/LoginPage";
import { MeusCursosPage } from "./pages/MeusCursosPage";
import { PerfilPage } from "./pages/PerfilPage";
import { ProvaCursoPage } from "./pages/ProvaCursoPage";
import { SecretariaPage } from "./pages/SecretariaPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/portal">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<PortalLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="catalogo" element={<CatalogoPage />} />
              <Route path="meus-cursos" element={<MeusCursosPage />} />
              <Route path="meus-cursos/:cursoId" element={<CursoDetalhePage />} />
              <Route path="meus-cursos/:cursoId/prova" element={<ProvaCursoPage />} />
              <Route path="aulas/:aulaId" element={<AulaPlayerPage />} />
              <Route path="conjuntos" element={<ConjuntosPage />} />
              <Route path="financas" element={<FinancasPage />} />
              <Route path="secretaria" element={<SecretariaPage />} />
              <Route path="perfil" element={<PerfilPage />} />
              <Route path="ativar" element={<AtivarPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
