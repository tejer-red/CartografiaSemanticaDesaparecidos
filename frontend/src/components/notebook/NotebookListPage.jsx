import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/localDatabase';
import { API_BASE_URL } from '../../config';
import { BookOpen, Map, ArrowLeft, Plus, Server, HardDrive, Trash2, Edit2, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GlobalAuthIndicator from '../auth/GlobalAuthIndicator';
import './NotebookListPage.css';

import createLogger from '../../utils/logger';
const logger = createLogger('NotebookListPage');

const NotebookListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notebooks, setNotebooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotebooksList = async () => {
    setLoading(true);
    try {
      // Obtener locales de IndexedDB
      const localNbs = await db.notebooks.toArray();
      const mappedLocal = await Promise.all(localNbs.map(async (l) => {
        let meta = null;
        if (l.configJSON) {
          try { meta = JSON.parse(l.configJSON); } catch(e) {}
        }
        
        // Count local notes
        let notesCount = 0;
        try {
          const stringName = String(l.name);
          notesCount = await db.navigation_logs.where('notebook_id').equals(stringName).count();
          
          // Fallback por si acaso fue guardado como entero
          if (notesCount === 0 && !isNaN(l.name)) {
             const numName = Number(l.name);
             const fallbackCount = await db.navigation_logs.where('notebook_id').equals(numName).count();
             if (fallbackCount > 0) notesCount = fallbackCount;
          }
          
          logger.log(`[Local Notebook: ${l.name}] Type of name: ${typeof l.name}, Computed notes count: ${notesCount}`);
        } catch(e) {
          logger.error(`[Local Notebook: ${l.name}] Error counting notes:`, e);
        }

        return {
          id: l.name,
          name: l.name,
          created_at: l.created_at || l.updated_at,
          isLocal: true,
          startDate: meta?.startDate || null,
          endDate: meta?.endDate || null,
          mapType: meta?.mapType || null,
          notesCount: notesCount
        };
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
              const notesCount = r.notesCount || 0;
              logger.log(`[Remote Notebook: ${name}] API Payload:`, r, `Computed notes count: ${notesCount}`);
              return {
                id: name,
                name: name,
                created_at: r.created_at || r.updated_at,
                isLocal: false,
                startDate: r.startDate || null,
                endDate: r.endDate || null,
                notesCount: notesCount
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

  const handleDeleteNotebook = async (e, nb) => {
    e.stopPropagation();
    
    // Solo permitir borrar si el usuario tiene sesión activa o si es puramente local (sin copia remota)
    if (!user && !nb.isLocal) {
      alert('Debes iniciar sesión para eliminar cuadernos del servidor.');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que deseas eliminar el cuaderno "${nb.name}"? Esta acción es irreversible.`)) {
      return;
    }

    try {
      // 1. Borrar del servidor si tiene copia remota o es exclusivamente remoto
      if (!nb.isLocal || nb.hasRemoteCopy) {
        const response = await fetch(`${API_BASE_URL}/notebooks/${nb.name}`, {
          method: 'DELETE',
        });
        if (!response.ok && response.status !== 404) {
          throw new Error('Error al eliminar del servidor');
        }
        logger.log(`Deleted remote notebook: ${nb.name}`);
      }

      // 2. Borrar localmente si existe
      if (nb.isLocal || nb.hasRemoteCopy) {
        const existingNb = await db.notebooks.where('name').equals(nb.name).first();
        if (existingNb) {
          await db.notebooks.delete(existingNb.id);
          await db.navigation_logs.where('notebook_id').equals(nb.name).delete();
          logger.log(`Deleted local notebook: ${nb.name}`);
        }
      }

      // Refrescar la lista
      fetchNotebooksList();
    } catch (err) {
      logger.error('Error deleting notebook:', err);
      alert('Hubo un problema al eliminar el cuaderno.');
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
            <span className="hide-on-mobile">Nueva Exploración</span>
          </button>
          <GlobalAuthIndicator />
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
                onClick={() => navigate(user ? `/cuaderno/${nb.name}` : `/visible/${nb.name}`)}
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

                <div className="notebook-metadata">
                  {nb.startDate && nb.endDate && (
                    <div className="meta-item">
                      <span className="meta-label">Período:</span>
                      <span className="meta-value">{nb.startDate} al {nb.endDate}</span>
                    </div>
                  )}
                  {nb.mapType && (
                    <div className="meta-item">
                      <span className="meta-label">Vista Principal:</span>
                      <span className="meta-value">
                        {nb.mapType === 'heatmap' ? 'Mapa de Calor' : nb.mapType === 'points' ? 'Puntos' : nb.mapType}
                      </span>
                    </div>
                  )}
                  <div className="meta-item">
                    <span className="meta-label">Total Notas:</span>
                    <span className="meta-value">{nb.notesCount || 0}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Autor:</span>
                    <span className="meta-value">{user ? user.email : 'Analista'}</span>
                  </div>
                </div>

                <div className="card-footer card-actions-footer">
                  {user ? (
                    <div className="auth-card-actions">
                      <button 
                        className="btn-card-action primary"
                        onClick={(e) => { e.stopPropagation(); navigate(`/cuaderno/${nb.name}`); }}
                      >
                        <Edit2 size={14} /> Editar
                      </button>
                      <button 
                        className="btn-card-action secondary"
                        onClick={(e) => { e.stopPropagation(); navigate(`/visible/${nb.name}`); }}
                      >
                        <Eye size={14} /> Visible
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="btn-card-action primary full-width"
                      onClick={(e) => { e.stopPropagation(); navigate(`/visible/${nb.name}`); }}
                    >
                      <Eye size={14} /> Visualización Pública
                    </button>
                  )}
                  {(user || (nb.isLocal && !nb.hasRemoteCopy)) && (
                    <button 
                      onClick={(e) => handleDeleteNotebook(e, nb)}
                      className="delete-card-btn"
                      title={nb.isLocal && !nb.hasRemoteCopy ? "Eliminar cuaderno local" : "Eliminar cuaderno (local y servidor)"}
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
