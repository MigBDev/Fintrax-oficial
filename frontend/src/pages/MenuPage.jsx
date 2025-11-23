// MenuPage.jsx
import React, { useState, useEffect } from "react";
import ChatBot from "../components/chatbot/ChatBot";
import "../styles/MenuPage.css";
import logo from "../assets/logo.png";
import userIcon from "../assets/user.png";
import botImage from "../assets/bothome.png";
import AjustesCuenta from "../pages/AjustesCuenta";
import MiPerfil from "../pages/MiPerfil";
import GestionFinanciera from "../pages/GestionFinanciera";
import Dashboard from "../pages/Dashboard";
import MetasAhorro from "../pages/MetasAhorro";
import { useNavigate } from "react-router-dom";

const sectionsData = [
  { id: "perfil", icon: "person", label: "Mi Perfil" },
  { id: "dashboard", icon: "dashboard", label: "Mis Finanzas" },
  { id: "registrar", icon: "app_registration", label: "Registrar" },
  { id: "educacion", icon: "school", label: "Educación" },
  { id: "logros", icon: "emoji_events", label: "Mis Logros" },
  { id: "metas", icon: "savings", label: "Metas de Ahorro" },
  { id: "ajustes", icon: "settings", label: "Ajustes de Cuenta" },
];

const MenuPage = () => {
  const [activeSection, setActiveSection] = useState(null);
  const [sectionTitle, setSectionTitle] = useState("Bienvenido");
  const [usuario, setUsuario] = useState({});
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showChatBot, setShowChatBot] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const cargarUsuario = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const res = await fetch("http://localhost:3000/api/usuarios/perfil", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const baseURL = "http://localhost:3000";
        const fotoURL = data.foto_perfil
          ? data.foto_perfil.startsWith("http")
            ? data.foto_perfil
            : `${baseURL}${data.foto_perfil}`
          : "";

        const userData = {
          documento: data.documento,
          nombre: data.nombre,
          apellido: data.apellido,
          email: data.email || data.correo,
          telefono: data.telefono,
          pais: data.pais,
          foto_perfil: fotoURL,
        };

        // ✅ Guardar todo el perfil
        setUsuario(userData);
        localStorage.setItem("usuario", JSON.stringify(userData));
      } catch (error) {
        console.error("Error al cargar perfil:", error);
        navigate("/login");
      }
    };

    cargarUsuario();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const renderSectionContent = (id, label) => {
    switch (id) {
      case "ajustes":
        return <AjustesCuenta />;
      case "registrar":
        return <GestionFinanciera />;
      case "dashboard":
        return <Dashboard />;
      case "perfil":
        return <MiPerfil />;
      case "metas":
        return <MetasAhorro />;
        case "chatbot":
        return <ChatBot />;
      default:
        return (
          <>
            <h2>{label}</h2>
            <p>Contenido de la sección {label}</p>
          </>
        );
    }
  };

  return (
    <div className="menu-wrapper">
      <div className="menu-container">
        {/* Sidebar */}
        <aside className="menu-sidebar">
          <div className="menu-logo">
            <img src={logo} alt="Fintrax Logo" className="menu-logo-img" />
          </div>
          <nav>
            <ul className="menu-list">
              {sectionsData.map(({ id, icon, label }) => (
                <li
                  key={id}
                  className={`menu-item ${activeSection === id ? "active" : ""}`}
                  onClick={() => {
                    setActiveSection(id);
                    setSectionTitle(label);
                  }}
                >
                  <span className="material-icons menu-icon">{icon}</span>
                  <span className="menu-item-label">{label}</span>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Contenido principal */}
        <div className="menu-main-content">
          <header className="menu-navbar">
            <div className="menu-navbar-left">
              <div className="menu-navbar-title">{sectionTitle}</div>
            </div>

            <div className="menu-navbar-user">
              <div className="menu-user-profile" onClick={() => setShowUserDropdown(!showUserDropdown)}>
                <img
                  src={usuario.foto_perfil || userIcon}
                  alt="User"
                  className="menu-avatar"
                />
                <div className="menu-user-info">
                  <p className="menu-user-name">{usuario.nombre}</p>
                  <p className="menu-user-email">{usuario.email}</p>
                </div>

                {showUserDropdown && (
                  <div className="menu-user-dropdown">
                    <button className="menu-btn" onClick={handleLogout}>
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="menu-content-wrapper">
            {activeSection === null ? (
              <section className="menu-section active-section">
                <div className="welcome-container">
                  <div className="welcome-text">
                    <h2>Bienvenido, {usuario.nombre}!</h2>
                    <p>Estamos encantados de tenerte con nosotros.</p>
                  </div>
                  <div className="welcome-bot">
                    <img
                      src={botImage}
                      alt="Bot"
                      className="bot-image"
                      onClick={() => setShowChatBot(!showChatBot)}
                      title="Habla con FintraBot"
                    />
                  </div>
                </div>
              </section>
            ) : (
              sectionsData.map(({ id, label }) => (
                <section
                  key={id}
                  className={`menu-section ${activeSection === id ? "active-section" : ""}`}
                >
                  <div className="menu-section-content">
                    {renderSectionContent(id, label)}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>

        {showChatBot && <ChatBot />}
      </div>
    </div>
  );
};

export default MenuPage;
