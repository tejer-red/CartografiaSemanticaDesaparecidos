import React from 'react';
import { Button, Box } from '@radix-ui/themes';
import NotebookListModal from './NotebookListModal';
import { Save, List } from 'lucide-react'; // Remove FolderOpen

const NotebookLoad = ({
  saveNotesToBackend,
  loadNotesFromBackend,
  listNotebooks,
  isModalOpen,
  setIsModalOpen,
  notebookList,
  hasUnsavedChanges,
  loadedNotebookId,
}) => {
  // Determine button text and color based on state
  const isNewNotebook = !loadedNotebookId;
  const saveButtonText = isNewNotebook
    ? 'Guardar cuaderno en servidor'
    : 'Guardar nueva copia';
  const saveButtonColor = (hasUnsavedChanges || isNewNotebook) ? 'green' : 'gray';
  const saveButtonDisabled = !hasUnsavedChanges && !isNewNotebook;

  return (
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
          disabled={saveButtonDisabled}
          color={saveButtonColor}
          style={{
            flex: 1,
            opacity: saveButtonDisabled ? 0.5 : 1,
            cursor: saveButtonDisabled ? 'not-allowed' : 'pointer'
          }}
        >
          <Save style={{ marginRight: 4 }} />
          {saveButtonText}
        </Button>
        <Button
          size="1"
          onClick={listNotebooks}
          style={{ flex: 1 }}
        >
          <List style={{ marginRight: 4 }} />
          Listar cuadernos
        </Button>
        {loadedNotebookId && (
          <Button
            size="1"
            variant="soft"
            onClick={() => window.open(`/dist/visible/${loadedNotebookId}`, '_blank')}
            style={{ flex: 1 }}
          >
            <List style={{ marginRight: 4 }} />
            Ver visualización
          </Button>
        )}
        <NotebookListModal
          listNotebooks={listNotebooks}
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          notebookList={notebookList}
        />
      </Box>
    </Box>
  );
};

export default NotebookLoad;
