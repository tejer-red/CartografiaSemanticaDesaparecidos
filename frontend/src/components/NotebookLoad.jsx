import React from 'react';
import { Button, Box } from '@radix-ui/themes';
import NotebookListModal from './NotebookListModal';
import { Save, FolderOpen, List } from 'lucide-react'; // Replace FontAwesome with Lucide

const NotebookLoad = ({
  saveNotesToBackend,
  loadNotesFromBackend,
  listNotebooks,
  isModalOpen,
  setIsModalOpen,
  notebookList,
}) => (
  <Box mb="3">
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
        onClick={saveNotesToBackend}
        style={{ flex: 1 }}
      >
        <Save style={{ marginRight: 4 }} /> {/* Use Lucide icon */}
        Guardar en servidor
      </Button>
      <Button
        size="1"
        onClick={() => loadNotesFromBackend(prompt('Ingrese el ID del cuaderno:'))}
        style={{ flex: 1 }}
      >
        <FolderOpen style={{ marginRight: 4 }} /> {/* Use Lucide icon */}
        Cargar del servidor
      </Button>
      <Button
        size="1"
        onClick={listNotebooks}
        style={{ flex: 1 }}
      >
        <List style={{ marginRight: 4 }} /> {/* Use Lucide icon */}
        Listar cuadernos
      </Button>
      <NotebookListModal
        listNotebooks={listNotebooks}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        notebookList={notebookList}
      />
    </Box>
  </Box>
);

export default NotebookLoad;
