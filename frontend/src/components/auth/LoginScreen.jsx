import React, { useState } from 'react';
import { Lock, User, AlertCircle, Mail, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/LoginScreen.css';

const LoginScreen = () => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        // On success, the AuthContext listener will update state and unmount this component
      } else {
        await signUp(email, password);
        setSuccessMsg('Registro exitoso. Puedes iniciar sesión ahora.');
        setIsLogin(true);
      }
    } catch (err) {
      if (err.message.includes('Invalid login credentials')) {
        setError('Credenciales inválidas. Verifica tu correo y contraseña.');
      } else if (err.message.includes('User already registered')) {
        setError('Este correo ya está registrado.');
      } else {
        setError(err.message || 'Ocurrió un error en la autenticación.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-overlay">
      <div className="login-screen-content">
        <h2 className="login-title">
          <Lock size={24} />
          Acceso Restringido
        </h2>

        <p className="login-info">
          Los datos contenidos en esta plataforma son sensibles.
          <br />
          Si desea solicitar acceso, puede escribir a:
          <br />
          <a href="mailto:accesos_cartografia@tejer.red">accesos_cartografia@tejer.red</a>
        </p>

        <div className="login-tabs">
          <button 
            className={`login-tab ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError(''); setSuccessMsg(''); }}
          >
            Iniciar Sesión
          </button>
          <button 
            className={`login-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError(''); setSuccessMsg(''); }}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-wrapper">
            <Mail size={20} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico"
              required
              autoFocus
            />
          </div>
          
          <div className="input-wrapper">
            <Key size={20} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {successMsg && (
            <div className="success-message">
              <User size={16} />
              {successMsg}
            </div>
          )}

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Procesando...' : (isLogin ? 'Ingresar' : 'Crear cuenta')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
