import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import LoginPage from "./pages/loginPage";
import RegisterPage from "./pages/RegisterPage";
import MenuPage from "./pages/MenuPage";
import GestionFinanciera from "./pages/GestionFinanciera";
import Dashboard from './pages/Dashboard';
import ResetPassword from "./pages/ResetPassword";
import ForgotPassword from "./pages/ForgotPassword";
import GoogleCallback from "./components/auth/GoogleCallback";
import { UserProvider } from "./components/Context/UserContext";
import { TransaccionProvider } from "./components/Context/TransaccionContext";
import "./App.css";
import "./styles/Responsive.css";

function App() {
  return (
    <Router basename="/Fintrax-oficial">
      {/* ✅ ORDEN CORRECTO: UserProvider debe estar FUERA de TransaccionProvider 
          si TransaccionProvider depende de usuario */}
      <UserProvider>
        <TransaccionProvider>
          <Routes>
            {/* Landing */}
            <Route path="/" element={<Home />} />

            {/* Login */}
            <Route path="/login" element={<LoginPage />} />

            {/* Registro */}
            <Route path="/register" element={<RegisterPage />} />

            {/* Reset password */}
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Forgot password */}
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Menú */}
            <Route path="/menu" element={<MenuPage />} />

            {/* Dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Gestión Financiera */}
            <Route path="/gestion-financiera" element={<GestionFinanciera />} />

            {/* Google OAuth callback */}
            <Route path="/auth/google/callback" element={<GoogleCallback />} />
          </Routes>
        </TransaccionProvider>
      </UserProvider>
    </Router>
  );
}

export default App;
