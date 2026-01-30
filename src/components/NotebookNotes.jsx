import React from 'react';
import { Button, Box } from '@radix-ui/themes';
import { Flag, StickyNote } from 'lucide-react'; // Cambiar Network por Flag

const NotebookNotes = ({
  noteTitle,
  setNoteTitle,
  newNote,
  setNewNote,
  addNote,
  addTextOnlyNote,
}) => (
  <Box mb="3">
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
        fontFamily: 'inherit',
        fontWeight: 400,
        minHeight: 60,
        boxSizing: 'border-box',
      }}
    />
    <Box
      mt="2"
      style={{
        display: 'flex',
        gap: 8,
        width: '100%',
      }}
    >
      <Button
        size="1"
        onClick={addNote}
        style={{ flex: 1 }}
      >
        <Flag style={{ marginRight: 4 }} />
        Marcar Navegación
      </Button>
      <Button
        size="1"
        onClick={addTextOnlyNote}
        style={{ flex: 1 }}
      >
        <StickyNote style={{ marginRight: 4 }} />
        Nota de Texto
      </Button>
    </Box>
  </Box>
);

export default NotebookNotes;
