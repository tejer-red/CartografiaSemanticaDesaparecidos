import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Network, 
  Layers, 
  Car, 
  Users, 
  MapPin, 
  ShieldAlert, 
  FileText, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  BarChart2
} from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { supabase } from '../../utils/supabase';
import '../../styles/ContextoListPage.css';
import '../../styles/GraphPage.css';

const RELATION_ICONS = {
  MODUS_OPERANDI: <ShieldAlert size={18} color="#f97316" />,
  REPORTE_POR_FAMILIAR: <Users size={18} color="#f43f5e" />,
  DESTINO_DECLARADO: <MapPin size={18} color="#3b82f6" />,
  VIAJABA_EN_VEHICULO: <Car size={18} color="#0284c7" />,
  PERPETRADO_CON_VEHICULO: <Car size={18} color="#a855f7" />,
  INSTITUCION_LUGAR: <Layers size={18} color="#10b981" />,
  INDICIOS_EN_SITIO: <FileText size={18} color="#f59e0b" />
};

const RELATION_TITLES = {
  MODUS_OPERANDI: 'Modus Operandi y Patrones de Sustracción',
  REPORTE_POR_FAMILIAR: 'Vínculo y Parentesco del Reportante',
  DESTINO_DECLARADO: 'Último Destino Declarado de la Víctima',
  VIAJABA_EN_VEHICULO: 'Vehículo en el que se Desplazaba la Víctima',
  PERPETRADO_CON_VEHICULO: 'Vehículo Identificado de los Perpetradores',
  INSTITUCION_LUGAR: 'Instituciones, Albergues y Centros de Retención',
  INDICIOS_EN_SITIO: 'Indicios Materiales Localizados en Escena'
};

const ContextoListPage = () => {
  const [data, setData] = useState({ categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collapsedCategories, setCollapsedCategories] = useState({});

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        // 1. Intentar consulta directa a Supabase
        try {
          const { data: vinculos, error: supaErr } = await supabase
            .from('vinculos_entidades')
            .select('relation_type, target_node, target_type');

          if (supaErr) throw supaErr;

          if (vinculos && vinculos.length > 0) {
            const groups = {};
            vinculos.forEach(v => {
              const r = v.relation_type || 'OTRO';
              if (!groups[r]) groups[r] = { count: 0, entities: {} };
              groups[r].count += 1;
              const target = v.target_node;
              groups[r].entities[target] = (groups[r].entities[target] || 0) + 1;
            });

            const categories = Object.keys(groups).map(r => {
              const topEntities = Object.entries(groups[r].entities)
                .map(([name, count]) => ({ 
                  nombre: name,
                  target_node: name,
                  repeticiones: count,
                  count: count 
                }))
                .sort((a, b) => b.repeticiones - a.repeticiones)
                .slice(0, 15);

              return {
                relation_type: r,
                title: RELATION_TITLES[r] || r.replace(/_/g, ' '),
                total_vinculos: groups[r].count,
                count: groups[r].count,
                entities: topEntities,
                top_entities: topEntities
              };
            }).sort((a, b) => b.total_vinculos - a.total_vinculos);

            setData({ categories });
            setLoading(false);
            return;
          }
        } catch (supaErr) {
          console.warn('Supabase context fetch failed, falling back to API:', supaErr);
        }

        // 2. Fallback a Backend API
        const res = await fetch(`${API_BASE_URL}/ontology/context-entities`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching context entities:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEntities();
  }, []);

  const toggleCategory = (rType) => {
    setCollapsedCategories(prev => ({ ...prev, [rType]: !prev[rType] }));
  };

  return (
    <div className="contexto-list-container">
      {/* Cabecera */}
      <div className="contexto-header-section">
        <div className="contexto-title-wrapper">
          <h1>Catálogo de Convenciones y Entidades de Contexto</h1>
          <p>
            Taxonomía relacional del Registro Ontológico de Desapariciones ordenada por frecuencia de repetición
          </p>
        </div>
        <Link to="/contexto/grafo" className="graph-btn-action graph-btn-primary" style={{ textDecoration: 'none' }}>
          <Network size={16} />
          <span>Ver en Hiper-Grafo de Contexto</span>
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Cargando catálogo ontológico y agregaciones estadísticas...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#b91c1c' }}>
          Error al cargar entidades: {error}
        </div>
      ) : (
        <div className="contexto-grid">
          {data.categories.map((cat) => {
            const isCollapsed = !!collapsedCategories[cat.relation_type];
            const icon = RELATION_ICONS[cat.relation_type] || <BarChart2 size={18} color="#64748b" />;
            const title = RELATION_TITLES[cat.relation_type] || cat.relation_type.replace(/_/g, ' ');
            const maxReps = cat.entities && cat.entities.length > 0 ? cat.entities[0].repeticiones : 1;

            return (
              <section key={cat.relation_type} className="contexto-category-card">
                <header className="contexto-category-header">
                  <div className="contexto-category-title">
                    {icon}
                    <span>{title}</span>
                    <span className="graph-badge-counter">
                      {cat.total_vinculos.toLocaleString()} vínculos
                    </span>
                  </div>
                  <button 
                    onClick={() => toggleCategory(cat.relation_type)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
                </header>

                {!isCollapsed && (
                  <table className="contexto-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40%' }}>Convención / Entidad Ontológica</th>
                        <th style={{ width: '20%' }}>Frecuencia</th>
                        <th style={{ width: '40%' }}>Distribución Relativa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.entities && cat.entities.length > 0 ? (
                        cat.entities.map((ent, idx) => {
                          const percentage = Math.round((ent.repeticiones / maxReps) * 100);
                          return (
                            <tr key={ent.target_node || idx}>
                              <td>
                                <strong style={{ color: '#0f172a' }}>{ent.nombre}</strong>
                                <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                  {ent.target_node}
                                </span>
                              </td>
                              <td>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                  {ent.repeticiones.toLocaleString()}
                                </span>
                              </td>
                              <td>
                                <div className="contexto-bar-container">
                                  <div className="contexto-bar-track">
                                    <div 
                                      className="contexto-bar-fill" 
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b', minWidth: '35px' }}>
                                    {percentage}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>
                            Sin desglose de entidades para esta categoría en la muestra.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ContextoListPage;
