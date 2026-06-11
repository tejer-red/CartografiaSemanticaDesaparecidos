import React from 'react';
import { Button, Box } from '@radix-ui/themes';
import { Flag, StickyNote } from 'lucide-react'; // Cambiar Network por Flag

const NotebookNotes = ({
  newNote,
  setNewNote,
  addNote,
  addTextOnlyNote,
}) => (
  <Box mb="3">
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
