import React from 'react';
import NotebookListModal from './NotebookListModal';
import { Save, FolderOpen, List } from 'lucide-react'; // Replace FontAwesome with Lucide

const buttonStyle = {
  flex: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 6px',
  backgroundColor: '#f1f3f5',
  color: '#495057',
  border: '1px solid #dee2e6',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: '12px',
  transition: 'all 0.2s',
};

const NotebookLoad = ({
  saveNotesToBackend,
  loadNotesFromBackend,
  listNotebooks,
  isModalOpen,
  setIsModalOpen,
  notebookList,
}) => (
  <div style={{ marginBottom: '12px' }}>
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
        onClick={saveNotesToBackend}
        style={buttonStyle}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#e9ecef';
          e.currentTarget.style.color = '#212529';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#f1f3f5';
          e.currentTarget.style.color = '#495057';
        }}
      >
        <Save size={14} style={{ marginRight: 4 }} /> {/* Use Lucide icon */}
        Guardar en servidor
      </button>
      <button
        type="button"
        onClick={() => loadNotesFromBackend(prompt('Ingrese el ID del cuaderno:'))}
        style={buttonStyle}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#e9ecef';
          e.currentTarget.style.color = '#212529';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#f1f3f5';
          e.currentTarget.style.color = '#495057';
        }}
      >
        <FolderOpen size={14} style={{ marginRight: 4 }} /> {/* Use Lucide icon */}
        Cargar del servidor
      </button>
      <button
        type="button"
        onClick={listNotebooks}
        style={buttonStyle}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#e9ecef';
          e.currentTarget.style.color = '#212529';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#f1f3f5';
          e.currentTarget.style.color = '#495057';
        }}
      >
        <List size={14} style={{ marginRight: 4 }} /> {/* Use Lucide icon */}
        Listar cuadernos
      </button>
      <NotebookListModal
        listNotebooks={listNotebooks}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        notebookList={notebookList}
      />
    </div>
  </div>
);

export default NotebookLoad;
