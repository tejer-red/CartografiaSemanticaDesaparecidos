import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
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
    <Dialog.Root open={true}>
      <Dialog.Overlay className="password-overlay" />
      <Dialog.Content className="password-content">
        <Dialog.Title className="password-title">
          <Lock size={24} />
          Acceso Restringido
        </Dialog.Title>

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
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default PasswordCheck;
