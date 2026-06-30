import React, { useState } from 'react';
import { User, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './GlobalAuthIndicator.css';

const GlobalAuthIndicator = () => {
  const { user, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLoginClick = () => {
    // Para iniciar sesión, podemos simplemente forzar una redirección a una ruta protegida
    // o podríamos abrir el modal si estuviera estructurado de esa forma.
    // Como LoginScreen aparece en rutas privadas, si el usuario quiere iniciar sesión 
    // y está en una pública, lo redirigimos a crear cuaderno para forzar login.
    window.location.href = '/cuaderno/nuevo';
  };

  if (!user) {
    return (
      <div className="global-auth-indicator" onClick={handleLoginClick} title="Iniciar sesión">
        <LogIn size={18} />
        <span className="auth-text">Iniciar sesión</span>
      </div>
    );
  }

  return (
    <div 
      className="global-auth-indicator logged-in" 
      onClick={() => setShowDropdown(!showDropdown)}
    >
      <User size={18} />
      <span className="auth-text">{user.email}</span>
      
      {showDropdown && (
        <div className="auth-dropdown">
          <div className="dropdown-user-info">
            Sesión iniciada
          </div>
          <button onClick={signOut} className="dropdown-signout-btn">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
};

export default GlobalAuthIndicator;
