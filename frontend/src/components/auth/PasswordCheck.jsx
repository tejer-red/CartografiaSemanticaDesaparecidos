import React, { useState } from 'react';
import { Lock, Key, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import '../../styles/PasswordCheck.css';

const PasswordCheck = ({ onAuthenticated }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/check_password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        onAuthenticated();
      } else {
        setError('La contraseña ingresada es incorrecta');
        setPassword('');
      }
    } catch (err) {
      setError('Error al verificar la contraseña');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 5000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div className="password-overlay" style={{ position: 'absolute', inset: 0 }} />
      <div className="password-content" style={{ position: 'relative', zIndex: 5001 }}>
        <h2 className="password-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lock size={24} />
          Acceso Restringido
        </h2>

        <p className="password-info">
          Los datos contenidos en esta plataforma son sensibles.
          <br />
          Si desea solicitar acceso, puede escribir a:
          <br />
          <a href="mailto:accesos_cartografia@tejer.red">accesos_cartografia@tejer.red</a>
        </p>

        <form onSubmit={handleSubmit} className="password-form">
          <div className="input-wrapper">
            <Key size={20} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese la contraseña"
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button type="submit" className="submit-button">
            <Lock size={18} />
            Verificar Acceso
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordCheck;
