import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLocalData } from '../../hooks/useLocalData';
import { useNavigationLog } from '../../hooks/useNavigationLog';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../lib/localDatabase';
import { X, Save, FileText, Link as LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import createLogger from '../../utils/logger';

const logger = createLogger('ImportContextModal');

const ImportContextModal = ({ isOpen, onClose, entityData, entityType, onImportComplete }) => {
  const { user } = useAuth();
  const { localFosas, localNoticias, localCedulas } = useData();
  const { addLocalFosa, addLocalNoticia, addLocalCedula } = useLocalData();
  
  const notebookId = window.location.pathname.match(/\/cuaderno\/([^\/]+)/)?.[1];
  const { addNavigationLog } = useNavigationLog(notebookId);
  const navigate = useNavigate();

  const [notebookName, setNotebookName] = useState('');
  const [noteText, setNoteText] = useState('');
  const [targetUuid, setTargetUuid] = useState('');
  const [relationType, setRelationType] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    const activeNotebookId = notebookId || notebookName;
    
    if (!activeNotebookId) {
      alert("Por favor ingrese un nombre para la bitácora.");
      return;
    }

    const timestamp = new Date().getTime(); // use numeric timestamp to link them
    const isoTimestamp = new Date(timestamp).toISOString();

    if (!notebookId && notebookName) {
      // Create notebook directly in DB
      try {
        await db.notebooks.add({ 
          name: notebookName, 
          configJSON: JSON.stringify({}), 
          created_at: isoTimestamp, 
          updated_at: isoTimestamp 
        });
        logger.log(`Creado nuevo cuaderno: ${notebookName}`);
      } catch (e) {
        logger.error("Error al crear cuaderno:", e);
      }
    }

    let newUuid = uuidv4();
    
    // Add entity
    try {
      let createdUuid;
      const { id: remoteId, ...restEntityData } = entityData; // Remove id to avoid Dexie ConstraintError on ++id
      const baseRecord = { ...restEntityData, remote_id: remoteId, uuid: newUuid, notebook_id: activeNotebookId, created_at: timestamp };
      logger.log(`Creando entidad local tipo ${entityType}:`, baseRecord);

      if (entityType === 'fosa') {
        createdUuid = await addLocalFosa(baseRecord);
      } else if (entityType === 'noticia') {
        createdUuid = await addLocalNoticia(baseRecord);
      } else if (entityType === 'cedula') {
        createdUuid = await addLocalCedula(baseRecord);
      }

      // Add Note
      if (noteText.trim()) {
        await db.navigation_logs.add({
          notebook_id: activeNotebookId,
          timestamp: isoTimestamp, // use ISO for navigation_logs as per useNavigationLog
          note: noteText,
          lat: entityData.lat,
          lng: entityData.lng,
          linked_entity_uuid: newUuid // extra link
        });
      }

      // Add Relation
      if (targetUuid && relationType) {
        const relationRecord = {
          uuid: uuidv4(),
          notebook_id: activeNotebookId,
          source_uuid: newUuid,
          target_uuid: targetUuid,
          tipo_relacion: relationType,
          descripcion: 'Relación creada al importar',
          created_at: timestamp,
          user_id: user?.id || 'default'
        };
        await db.local_vinculos.add(relationRecord);
        logger.log('Relación creada:', relationRecord);
      }

      if (!notebookId && notebookName) {
        logger.log(`Navegando al nuevo cuaderno: ${notebookName}`);
        navigate(`/cuaderno/${notebookName}`);
      }

      logger.log('Importación completada exitosamente.');
      onImportComplete();
      onClose();
    } catch (err) {
      logger.error("Error importing entity:", err);
      alert("Error al importar entidad.");
    }
  };

  // gather all possible targets for relation
  const possibleTargets = [
    ...(localFosas || []).map(f => ({ uuid: f.uuid, label: `Fosa en ${f.municipio}` })),
    ...(localNoticias || []).map(n => ({ uuid: n.uuid, label: `Noticia: ${n.titular}` })),
    ...(localCedulas || []).map(c => ({ uuid: c.uuid, label: `Cédula: ${c.nombre_completo}` }))
  ].filter(t => t.uuid !== entityData.uuid);

  return (
    <div className="login-screen-overlay" style={{ zIndex: 7000 }}>
      <div className="login-screen-content" style={{ maxWidth: '600px', width: '100%' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <X size={20} color="#6b7280" />
        </button>
        
        <h2 className="login-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4f46e5' }}>
          <Save size={24} />
          Importar al Cuaderno Local
        </h2>

        <form onSubmit={handleSave} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {!notebookId && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>Nombre de la Bitácora / Cuaderno</label>
              <input 
                type="text" 
                required 
                value={notebookName} 
                onChange={e => setNotebookName(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                placeholder="Ej. investigacion-zapopan"
              />
            </div>
          )}

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>
              <FileText size={16} /> Nota de Navegación
            </label>
            <textarea 
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="¿Por qué estás guardando este registro?"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px', resize: 'vertical' }}
            />
          </div>

          <div style={{ padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '8px', borderLeft: '4px solid #6366f1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '13px', fontWeight: 'bold' }}>
              <LinkIcon size={16} /> Relacionar con entidad existente (Opcional)
            </label>
            
            <select 
              value={targetUuid} 
              onChange={e => setTargetUuid(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginBottom: '10px' }}
            >
              <option value="">-- No relacionar --</option>
              {possibleTargets.map(t => (
                <option key={t.uuid} value={t.uuid}>{t.label}</option>
              ))}
            </select>

            {targetUuid && (
              <select 
                value={relationType} 
                onChange={e => setRelationType(e.target.value)}
                required={!!targetUuid}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              >
                <option value="">-- Tipo de Relación --</option>
                <option value="PERTENECE_A_FOSA">Pertenece a Fosa</option>
                <option value="REPORTADO_EN">Reportado en Noticia</option>
                <option value="VINCULO_FAMILIAR">Vínculo Familiar</option>
                <option value="ETIQUETA">Etiqueta Genérica</option>
              </select>
            )}
          </div>

          <button type="submit" className="submit-button" style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <Save size={18} /> Guardar Entidad y Contexto
          </button>

        </form>
      </div>
    </div>
  );
};

export default ImportContextModal;
