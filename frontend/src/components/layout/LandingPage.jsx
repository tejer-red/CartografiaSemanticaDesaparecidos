import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, BookOpen, FileText, Github, Download, Info, BarChart2 } from 'lucide-react';
import GlobalAuthIndicator from '../auth/GlobalAuthIndicator';
import './LandingPage.css';

const LandingPage = ({ listNotebooksApp }) => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      {/* Header simple */}
      <header className="landing-header">
        <div className="landing-logo">
          <Map size={24} className="logo-icon" />
          <span>Cartografía de Desapariciones</span>
        </div>
        <div className="header-right-actions">
          <a 
            href="https://github.com/tejer-red" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="github-link"
          >
            <Github size={20} />
            <span className="hide-on-mobile">GitHub</span>
          </a>
          <GlobalAuthIndicator />
        </div>
      </header>

      {/* Main Hero */}
      <main className="landing-hero">
        <h1 className="hero-title">
          Cartografía Interactiva de la Crisis de Desapariciones en Jalisco
        </h1>
        <p className="hero-subtitle">
          Plataforma de geolocalización y análisis semántico basada en el documento de trabajo 
          <strong> "Mapeo de la Crisis Humanitaria de Desapariciones Forzadas en Jalisco: Patrones, Tecnología y Acción Colectiva"</strong> por <em>Angel Javier Ramirez Abundis</em>.
        </p>

        {/* Acciones principales */}
        <div className="action-buttons">
          <button 
            onClick={() => navigate('/cuaderno/nuevo')}
            className="action-btn btn-primary"
          >
            <Map size={20} />
            Nueva Exploración
          </button>
          <button 
            onClick={listNotebooksApp}
            className="action-btn btn-secondary"
          >
            <BookOpen size={20} />
            Listar Cuadernos
          </button>
        </div>
      </main>

      {/* Secciones informativas */}
      <section className="info-sections">
        <div className="info-card">
          <div className="card-header">
            <Info size={24} className="card-icon" />
            <h2>Sobre el Proyecto</h2>
          </div>
          <p>
            Esta iniciativa utiliza ciencias sociales computacionales y análisis estadístico para identificar patrones, 
            mapear reportes de desapariciones del Registro Nacional de Personas Desaparecidas y No Localizadas (RNPDNO) 
            y proveer información útil para colectivos, investigadores y tomadores de decisiones.
          </p>
        </div>

        <div className="info-card">
          <div className="card-header">
            <BarChart2 size={24} className="card-icon" />
            <h2>Funcionalidades Clave</h2>
          </div>
          <ul>
            <li><strong>Geolocalización por colonias:</strong> Mapeo detallado de más de 3,000 casos geoespaciales de Jalisco.</li>
            <li><strong>Análisis temporal:</strong> Línea del tiempo interactiva que muestra patrones entre 2018 y 2024.</li>
            <li><strong>Correlaciones semánticas:</strong> Identificación de vínculos implícitos entre registros utilizando procesamiento de lenguaje natural.</li>
            <li><strong>Cuadernos de bitácora:</strong> Herramienta colaborativa local para salvar y compartir estados de exploración.</li>
          </ul>
        </div>
      </section>

      {/* Descarga y Metodología */}
      <section className="download-section">
        <div className="download-box">
          <FileText size={32} className="download-icon" />
          <div className="download-text">
            <h3>Documento de Trabajo Completo</h3>
            <p>Conoce a fondo el análisis metodológico, la estructuración de clusters geográficos y los desafíos de búsqueda en el estado.</p>
          </div>
          <a 
            href="https://datades.abundis.com.mx/workingpaper.pdf" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="download-btn"
          >
            <Download size={18} />
            Descargar PDF
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} Tejer.Red. Desarrollado en colaboración con académicos e investigadores independientes.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
