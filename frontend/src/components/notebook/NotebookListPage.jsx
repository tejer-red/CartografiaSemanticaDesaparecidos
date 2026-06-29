import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/localDatabase';
import { API_BASE_URL } from '../../config';
import { BookOpen, Map, ArrowLeft, Plus, Server, HardDrive, Trash2 } from 'lucide-react';
import './NotebookListPage.css';

import createLogger from '../../utils/logger';
const logger = createLogger('NotebookListPage');

const NotebookListPage = () => {
  const navigate = useNavigate();
  const [notebooks, setNotebooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotebooksList = async () => {
    setLoading(true);
    try {
      // Obtener locales de IndexedDB
      const localNbs = await db.notebooks.toArray();
      const mappedLocal = localNbs.map(l => ({
        id: l.name,
        name: l.name,
        created_at: l.created_at || l.updated_at,
        isLocal: true
      }));

      let merged = [...mappedLocal];

      // Obtener remotos de la API
      try {
        const response = await fetch(`${API_BASE_URL}/notebooks`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.notebooks) {
            const remoteNbs = data.notebooks.map(r => {
              const name = typeof r === 'string' ? r : r.name;
              return {
                id: name,
                name: name,
                created_at: r.created_at || r.updated_at,
                isLocal: false
              };
            });

            // Combinar evitando duplicados
            remoteNbs.forEach(remote => {
              const exists = merged.find(m => m.name === remote.name);
              if (exists) {
                // Si existe local y remoto, marcamos que tiene copia en servidor
                exists.hasRemoteCopy = true;
              } else {
                merged.push(remote);
              }
            });
          }
        }
      } catch (err) {
        logger.error('Error fetching remote notebooks:', err);
      }

      // Ordenar por nombre o fecha
      merged.sort((a, b) => a.name.localeCompare(b.name));
      setNotebooks(merged);
    } catch (err) {
      logger.error('Error fetching notebooks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotebooksList();
  }, []);

  const handleDeleteLocal = async (e, name) => {
    e.stopPropagation(); // Evitar navegación al hacer clic en borrar
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el cuaderno local "${name}"?`)) {
      return;
    }
    try {
      const existingNb = await db.notebooks.where('name').equals(name).first();
      if (existingNb) {
        await db.notebooks.delete(existingNb.id);
        // También borrar sus logs asociados
        await db.navigation_logs.where('notebook_id').equals(name).delete();
        logger.log(`Deleted local notebook: ${name}`);
        fetchNotebooksList();
      }
    } catch (err) {
      logger.error('Error deleting local notebook:', err);
      alert('No se pudo eliminar el cuaderno local.');
    }
  };

  return (
    <div className="list-page-container">
      {/* Header */}
      <header className="list-page-header">
        <button onClick={() => navigate('/')} className="back-btn">
          <ArrowLeft size={18} />
          Volver al Inicio
        </button>
        <div className="header-actions">
          <button onClick={() => navigate('/cuaderno/nuevo')} className="new-explore-btn">
            <Plus size={18} />
            Nueva Exploración
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="list-page-main">
        <div className="title-section">
          <BookOpen size={32} className="title-icon" />
          <h1>Cuadernos de Investigación</h1>
          <p className="title-description">
            Selecciona un cuaderno guardado para restaurar el estado del mapa, filtros y notas de investigación.
          </p>
        </div>

        {loading ? (
          <div className="list-loading">Cargando cuadernos disponibles...</div>
        ) : notebooks.length === 0 ? (
          <div className="empty-state">
            <p>No se encontraron cuadernos guardados en este dispositivo ni en el servidor.</p>
            <button onClick={() => navigate('/cuaderno/nuevo')} className="btn-primary">
              Iniciar Nueva Exploración
            </button>
          </div>
        ) : (
          <div className="notebooks-grid">
            {notebooks.map((nb) => (
              <div 
                key={nb.id} 
                className="notebook-card"
                onClick={() => navigate(`/cuaderno/${nb.name}`)}
              >
                <div className="card-top">
                  <div className="notebook-icon-wrapper">
                    <BookOpen size={24} className="card-nb-icon" />
                  </div>
                  <div className="badges">
                    {nb.isLocal && (
                      <span className="badge badge-local" title="Guardado localmente en este navegador">
                        <HardDrive size={12} /> Local
                      </span>
                    )}
                    {!nb.isLocal && (
                      <span className="badge badge-server" title="Guardado en el servidor">
                        <Server size={12} /> Servidor
                      </span>
                    )}
                    {nb.hasRemoteCopy && (
                      <span className="badge badge-sync" title="Sincronizado con el servidor">
                        Sincronizado
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="notebook-card-title">{nb.name}</h3>
                
                {nb.created_at && (
                  <p className="notebook-card-date">
                    Modificado: {new Date(nb.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}

                <div className="card-footer">
                  <span className="open-link">Abrir cuaderno →</span>
                  {nb.isLocal && (
                    <button 
                      onClick={(e) => handleDeleteLocal(e, nb.name)}
                      className="delete-card-btn"
                      title="Eliminar cuaderno local"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="list-page-footer">
        <p>© {new Date().getFullYear()} Tejer.Red. Plataforma de Cartografía de Desapariciones.</p>
      </footer>
    </div>
  );
};

export default NotebookListPage;
