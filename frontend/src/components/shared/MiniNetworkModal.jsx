import React, { useMemo, useEffect } from 'react';
import { SigmaContainer, useLoadGraph, ControlsContainer, ZoomControl } from '@react-sigma/core';
import Graph from 'graphology';
import { circular } from 'graphology-layout';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { X, Network } from 'lucide-react';
import { db } from '../../lib/localDatabase';
import '../../styles/sigma.css';

const LoadGraph = ({ graph }) => {
  const loadGraph = useLoadGraph();
  useEffect(() => {
    if (graph) loadGraph(graph);
  }, [graph, loadGraph]);
  return null;
};

const MiniNetworkModal = ({ isOpen, onClose, vinculo, allVinculos = [], localFosas, localNoticias, localCedulas, fetchedRecords, forenseRecords }) => {
  const graph = useMemo(() => {
    if (!isOpen) return null;
    const linksToGraph = allVinculos.length > 0 ? allVinculos : (vinculo ? [vinculo] : []);
    if (linksToGraph.length === 0) return null;

    const g = new Graph();

    const findEntity = (uuid) => {
      if (uuid.startsWith('TAG-')) {
        return { label: uuid.replace('TAG-', ''), color: '#8b5cf6', size: 20 }; // Etiquetas son moradas y grandes
      }

      const fosa = localFosas?.find(f => f.uuid === uuid || f.id === uuid);
      if (fosa) return { label: `Fosa en ${fosa.municipio}`, color: '#6366f1' };
      
      const noticia = localNoticias?.find(n => n.uuid === uuid || n.id === uuid);
      if (noticia) return { label: noticia.titular, color: '#e11d48' };

      const cedula = localCedulas?.find(c => c.uuid === uuid || c.id === uuid);
      if (cedula) return { label: cedula.nombre_completo, color: '#10b981' };

      // Búsqueda en registros remotos (fetchedRecords -> Fosas/Noticias en GeoJSON, forenseRecords -> Cédulas)
      if (fetchedRecords && fetchedRecords.features) {
        const remoteFosa = fetchedRecords.features.find(f => f.properties?.uuid === uuid || f.properties?.id === uuid);
        if (remoteFosa) {
          if (remoteFosa.properties?.tipo_marcador === 'noticia') {
            return { label: `(Remoto) ${remoteFosa.properties.titular || 'Noticia'}`, color: '#f43f5e' };
          }
          return { label: `(Remoto) Fosa en ${remoteFosa.properties.municipio || 'Ubicación desconocida'}`, color: '#818cf8' };
        }
      }

      if (forenseRecords && forenseRecords.features) {
        const remoteCedula = forenseRecords.features.find(f => f.properties?.uuid === uuid || f.properties?.id === uuid);
        if (remoteCedula) {
          return { label: `(Remoto) ${remoteCedula.properties.nombre_completo || 'Cédula'}`, color: '#34d399' };
        }
      }

      return { label: `Resto Forense / ID (${uuid.substring(0, 5)})`, color: '#f59e0b' };
    };

    linksToGraph.forEach(v => {
      const source = findEntity(v.source_uuid);
      const target = findEntity(v.target_uuid);

      if (!g.hasNode(v.source_uuid)) {
        g.addNode(v.source_uuid, {
          x: Math.random(),
          y: Math.random(),
          size: source.size || 15,
          label: source.label,
          color: source.color,
        });
      }

      if (!g.hasNode(v.target_uuid)) {
        g.addNode(v.target_uuid, {
          x: Math.random(),
          y: Math.random(),
          size: target.size || 15,
          label: target.label,
          color: target.color,
        });
      }

      if (!g.hasEdge(v.source_uuid, v.target_uuid)) {
        const isTag = v.tipo_relacion === 'ETIQUETA';
        g.addEdge(v.source_uuid, v.target_uuid, {
          type: isTag ? 'line' : 'arrow',
          label: isTag ? '' : v.tipo_relacion.replace(/_/g, ' '),
          size: isTag ? 3 : 2,
          color: isTag ? '#8b5cf6' : '#9ca3af'
        });
      }
    });

    if (linksToGraph.length === 1) {
      circular.assign(g);
      const v = linksToGraph[0];
      g.setNodeAttribute(v.source_uuid, 'x', -1);
      g.setNodeAttribute(v.target_uuid, 'x', 1);
      g.setNodeAttribute(v.source_uuid, 'y', 0);
      g.setNodeAttribute(v.target_uuid, 'y', 0);
    } else {
      circular.assign(g);
      forceAtlas2.assign(g, { iterations: 100, settings: { gravity: 1 } });
    }

    return g;
  }, [isOpen, vinculo, allVinculos, localFosas, localNoticias, localCedulas, fetchedRecords, forenseRecords]);

  const isVisible = isOpen && (vinculo || allVinculos.length > 0);

  return (
    <div className="login-screen-overlay" style={{ zIndex: 6000, display: isVisible ? 'flex' : 'none' }}>
      <div className="login-screen-content" style={{ maxWidth: '900px', width: '90%' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <X size={20} color="#6b7280" />
        </button>
        
        <h2 className="login-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4f46e5' }}>
          <Network size={24} />
          {allVinculos.length > 1 ? 'Red de Relaciones' : 'Visualización de Relación'}
        </h2>

        <div style={{ marginTop: '20px', height: '600px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', position: 'relative' }}>
          <SigmaContainer 
            style={{ width: '100%', height: '100%' }}
            settings={{
              renderLabels: true,
              renderEdgeLabels: true,
              defaultEdgeType: 'arrow',
              labelSize: 14,
              edgeLabelSize: 12,
              allowInvalidContainer: true,
            }}
          >
            <LoadGraph graph={graph} />
            <ControlsContainer position={"bottom-right"}>
              <ZoomControl />
            </ControlsContainer>
          </SigmaContainer>
        </div>

        {vinculo && allVinculos.length === 0 && (
          <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#1e3a8a' }}>
              <strong>{vinculo.tipo_relacion === 'ETIQUETA' ? 'Etiqueta:' : 'Relación:'}</strong> {vinculo.tipo_relacion === 'ETIQUETA' ? vinculo.target_uuid.replace('TAG-', '') : vinculo.tipo_relacion.replace(/_/g, ' ')}
            </p>
            {vinculo.descripcion && (
              <p style={{ margin: 0, fontSize: '13px', color: '#3b82f6', fontStyle: 'italic' }}>"{vinculo.descripcion}"</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MiniNetworkModal;
