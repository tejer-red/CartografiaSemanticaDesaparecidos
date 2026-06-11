import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import '../styles/Notebook.css';
import { Button, Heading, Box } from '@radix-ui/themes';
import { useNotebook } from '../utils/notebook';
import NotebookNotes from './NotebookNotes';
import NotebookLoad from './NotebookLoad';
import GlobalTimeGraphData from './GlobalTimeGraphData';
import { MapPin, ArrowLeft, Plus } from 'lucide-react'; // Cambiar Flag por ArrowLeft

const Notebook = () => {
  const dataContext = useData();
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    notes,
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

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
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
        <MapPin style={{ fontSize: 28, color: '#007bff' }} /> {/* Use Lucide icon */}
        <Heading size="1" style={{ margin: 0, fontSize: '1rem', lineHeight: '1.2' }}>
          Bitácora de navegación
        </Heading>
      </Box>
      <Box style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        <GlobalTimeGraphData
          map={dataContext.map}
          COLORS={dataContext.COLORS}
          selectedDate={dataContext.selectedDate}
          timeScale={dataContext.timeScale}
          setSelectedDate={dataContext.setSelectedDate}
          setTimeScale={dataContext.setTimeScale}
          newDataFetched={dataContext.newDataFetched}
          newForenseDataFetched={dataContext.newForenseDataFetched}
        />
        <NotebookNotes
          newNote={newNote}
          setNewNote={setNewNote}
          addNote={addNote}
          addTextOnlyNote={addTextOnlyNote}
        />
        <Box>
          {notes.length === 0 ? (
            <Box color="gray" mb="2">¡Aún no hay notas! Agrega una para comenzar.</Box>
          ) : (
            notes.map(note => (
              <Box
                key={note.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 10,
                  background: '#fafbfc',
                }}
              >
                <Box mb="1" style={{ whiteSpace: 'pre-wrap' }}>{note.text}</Box>
                <Box
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: '#888',
                  }}
                >
                  <span>{formatTimestamp(note.timestamp)}</span>
                  <Box style={{ display: 'flex', gap: 6 }}>
                    {note.state && (
                      <Button
                        size="1"
                        variant="soft"
                        onClick={() => restoreState(note.state)}
                        title="Añadir marcador en este estado"
                      >
                        <ArrowLeft size={14} />
                        Ir a marcador
                      </Button>
                    )}
                    <Button
                      size="1"
                      variant="ghost"
                      color="red"
                      onClick={() => deleteNote(note.id)}
                      title="Eliminar esta nota"
                    >
                      🗑️
                    </Button>
                  </Box>
                </Box>
              </Box>
            ))
          )}
        </Box>
        <NotebookLoad
          saveNotesToBackend={saveNotesToBackend}
          loadNotesFromBackend={loadNotesFromBackend}
          listNotebooks={listNotebooks}
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          notebookList={notebookList}
        />
      </Box>
    </div>
  );
};

export default Notebook;
