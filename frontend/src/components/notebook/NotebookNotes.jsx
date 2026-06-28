import React from 'react';
import { Flag, StickyNote } from 'lucide-react'; // Cambiar Network por Flag

const NotebookNotes = ({
  noteTitle,
  setNoteTitle,
  newNote,
  setNewNote,
  addNote,
  addTextOnlyNote,
}) => (
  <div style={{ marginBottom: '12px' }}>
    <input
      type="text"
      value={noteTitle}
      onChange={(e) => setNoteTitle(e.target.value)}
      placeholder="Título de la nota..."
      style={{
        width: '100%',
        borderRadius: 6,
        border: '1px solid #ddd',
        padding: 8,
        fontSize: 15,
        fontFamily: 'inherit',
        marginBottom: 8,
        fontWeight: 600,
        boxSizing: 'border-box',
      }}
    />
    <textarea
      value={newNote}
      onChange={(e) => setNewNote(e.target.value)}
      placeholder="Nota de texto..."
      rows={3}
      style={{
        width: '100%',
        resize: 'vertical',
        borderRadius: 6,
        border: '1px solid #ddd',
        padding: 8,
        fontSize: 15,
        minHeight: 60,
      }}
    />
    <div
      style={{
        marginTop: '8px',
        display: 'flex',
        gap: 8,
        width: '100%',
      }}
    >
      <button
        type="button"
        onClick={addNote}
        style={{
          flex: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 12px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontWeight: 500,
          fontSize: '14px',
          transition: 'background-color 0.2s',
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
      >
        <Flag size={16} style={{ marginRight: 4 }} />
        Marcar Navegación
      </button>
      <button
        type="button"
        onClick={addTextOnlyNote}
        style={{
          flex: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 12px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontWeight: 500,
          fontSize: '14px',
          transition: 'background-color 0.2s',
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
      >
        <StickyNote size={16} style={{ marginRight: 4 }} />
        Nota de Texto
      </button>
    </div>
  </div>
);

export default NotebookNotes;
