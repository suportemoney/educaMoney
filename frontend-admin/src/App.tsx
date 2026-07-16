import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./components/AdminLayout";
import { RequireAuth } from "./components/RequireAuth";
import { AuthProvider } from "./context/AuthContext";
import { AlunosPage } from "./pages/AlunosPage";
import { AtivacoesPage } from "./pages/AtivacoesPage";
import { CategoriasPage } from "./pages/CategoriasPage";
import { CertificadosPage } from "./pages/CertificadosPage";
import { ConjuntosPage } from "./pages/ConjuntosPage";
import { CursoConteudoPage } from "./pages/CursoConteudoPage";
import { CursosPage } from "./pages/CursosPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { PlanosPage } from "./pages/PlanosPage";
import { IntegracaoPage } from "./pages/IntegracaoPage";
import { SecretariaAdminPage } from "./pages/SecretariaAdminPage";
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
              <Route path="alunos" element={<AlunosPage />} />
              <Route path="planos" element={<PlanosPage />} />
              <Route path="integracao" element={<IntegracaoPage />} />
              <Route path="categorias" element={<CategoriasPage />} />
              <Route path="conjuntos" element={<ConjuntosPage />} />
              <Route path="cursos" element={<CursosPage />} />
              <Route path="cursos/:cursoId/conteudo" element={<CursoConteudoPage />} />
              <Route path="tokens" element={<TokensPage />} />
              <Route path="ativacoes" element={<AtivacoesPage />} />
              <Route path="certificados" element={<CertificadosPage />} />
              <Route path="secretaria" element={<SecretariaAdminPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
