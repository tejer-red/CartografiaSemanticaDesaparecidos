import React from 'react';
import { X, Network, Link as LinkIcon, Database } from 'lucide-react';
import '../../styles/FilterForm.css';

const SemanticLinkInfoModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="login-screen-overlay" style={{ zIndex: 6000 }}>
      <div className="login-screen-content" style={{ maxWidth: '600px' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <X size={20} color="#6b7280" />
        </button>
        
        <h2 className="login-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4f46e5' }}>
          <Network size={24} />
          ¿Qué es un Vínculo Semántico?
        </h2>

        <div style={{ marginTop: '20px', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
          <p>
            En Cartografía Semántica, los datos no son puntos aislados. Un <strong>vínculo semántico</strong> es un "puente" de información que conecta dos registros para darles un contexto más profundo.
          </p>

          <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '8px', borderLeft: '4px solid #6366f1' }}>
            <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LinkIcon size={16} color="#6366f1"/>
              ¿Cómo crear uno?
            </h4>
            <ol style={{ margin: 0, paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}>En este panel de <strong>Ingesta de datos</strong>, despliega cualquier Fosa, Noticia o Cédula.</li>
              <li style={{ marginBottom: '8px' }}>Haz clic en el icono de enlace (<LinkIcon size={14} />) al lado del registro.</li>
              <li style={{ marginBottom: '8px' }}>Se abrirá una ventana para <strong>buscar el registro destino</strong> (por ejemplo, buscar "Tonalá" para hallar una noticia).</li>
              <li>Selecciona el tipo de relación (ej. <em>PERTENECE_A_FOSA</em>) y guarda.</li>
            </ol>
          </div>

          <h4 style={{ color: '#111827', marginTop: '20px' }}>Ejemplo Práctico</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', margin: '15px 0', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <div style={{ textAlign: 'center' }}>
              <Database size={24} color="#e11d48" style={{ margin: '0 auto' }} />
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>Noticia</div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>"Hallazgo en Zapopan"</div>
            </div>
            
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ borderTop: '2px dashed #6366f1', margin: '10px 0' }}></div>
              <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 'bold' }}>REPORTADO_EN</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <Database size={24} color="#6366f1" style={{ margin: '0 auto' }} />
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>Fosa</div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Zapopan Centro</div>
            </div>
          </div>

          <p style={{ marginTop: '20px', fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>
            * Estos vínculos forman el Grafo de Conocimiento que nos permite encontrar patrones de macrocriminalidad y relacionar eventos desconectados en el tiempo.
          </p>
        </div>

        <button onClick={onClose} className="submit-button" style={{ marginTop: '20px' }}>
          ¡Entendido!
        </button>
      </div>
    </div>
  );
};

export default SemanticLinkInfoModal;
