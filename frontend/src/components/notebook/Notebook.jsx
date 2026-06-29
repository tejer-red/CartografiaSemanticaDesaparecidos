import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import '../../styles/Notebook.css';
import { useNotebook } from '../../utils/notebook';
import NotebookNotes from './NotebookNotes';
import GlobalTimeGraph from '../timeline/GlobalTimeGraph';
import { MapPin, ArrowLeft, Info, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Notebook = () => {
  const dataContext = useData();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showInfoModal, setShowInfoModal] = React.useState(false);

  const {
    notes,
    noteTitle,
    setNoteTitle,
    newNote,
    setNewNote,
    addNote,
    addTextOnlyNote,
    saveNotesToBackend,
    loadNotesFromBackend,
    listNotebooks,
    deleteNote,
    restoreState,
    formatTimestamp,
    isModalOpen,
    setIsModalOpen,
    notebookList,
  } = useNotebook(dataContext, id, navigate);

  React.useEffect(() => {
    const handleSave = (e) => saveNotesToBackend(e.detail?.name);
    const handleLoad = (e) => loadNotesFromBackend(e.detail?.id);
    const handleList = () => listNotebooks();

    window.addEventListener('saveNotebookRequested', handleSave);
    window.addEventListener('loadNotebookRequested', handleLoad);
    window.addEventListener('listNotebooksRequested', handleList);

    return () => {
      window.removeEventListener('saveNotebookRequested', handleSave);
      window.removeEventListener('loadNotebookRequested', handleLoad);
      window.removeEventListener('listNotebooksRequested', handleList);
    };
  }, [saveNotesToBackend, loadNotesFromBackend, listNotebooks]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '10px 20px 4px 20px',
          borderBottom: '1px solid #eee',
          background: '#fafbfc',
          gap: 8,
        }}
      >
        <MapPin style={{ fontSize: 28, color: '#007bff' }} />
        <h2 style={{ margin: 0, fontSize: '1rem', lineHeight: '1.2', fontWeight: 600 }}>
          Bitácora de navegación
        </h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        <GlobalTimeGraph />
        <NotebookNotes
          noteTitle={noteTitle}
          setNoteTitle={setNoteTitle}
          newNote={newNote}
          setNewNote={setNewNote}
          addNote={addNote}
          addTextOnlyNote={addTextOnlyNote}
        />
        <div>
          {notes.length === 0 ? (
            <div style={{ color: 'gray', marginBottom: '8px' }}>¡Aún no hay notas! Agrega una para comenzar.</div>
          ) : (
            notes.map(note => (
              <div
                key={note.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 10,
                  background: '#fafbfc',
                }}
              >
                <div style={{ marginBottom: '4px', whiteSpace: 'pre-wrap' }}>{note.text}</div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: '#888',
                  }}
                >
                  <span>{formatTimestamp(note.timestamp)}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {note.state && (
                      <button
                        type="button"
                        onClick={() => restoreState(note.state)}
                        title="Añadir marcador en este estado"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          backgroundColor: '#e6f0fa',
                          color: '#007bff',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: 500,
                          transition: 'background-color 0.2s',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#d0e3f7'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#e6f0fa'}
                      >
                        <ArrowLeft size={12} />
                        Ir a marcador
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteNote(note.id)}
                      title="Eliminar esta nota"
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        color: '#e5484d',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: '11px',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fdebee'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Notebook;
