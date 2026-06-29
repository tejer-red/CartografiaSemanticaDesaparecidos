import React from 'react';
import { X } from 'lucide-react';

import createLogger from '../../utils/logger';
const logger = createLogger('NotebookListModal');


const NotebookListModal = ({
  isModalOpen,
  setIsModalOpen,
  notebookList = [],
  onSelectNotebook,
  title = "Cuadernos Disponibles",
  inDialog = false
}) => {
  const ModalContent = () => (
    <>
      <h2 style={{ fontWeight: 600, fontSize: 22, marginBottom: 20, marginTop: 0 }}>
        {title}
      </h2>
      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
        {notebookList.map((notebook, index) => {
          const notebookName = typeof notebook === 'string' ? notebook : notebook.name;
          const isLocal = typeof notebook === 'object' && notebook.isLocal;
          return (
            <div
              key={index}
              style={{
                padding: "12px",
                borderBottom: "1px solid #eee",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onClick={() => {
                logger.log("Selected notebook:", notebookName);
                if (onSelectNotebook) {
                  onSelectNotebook(notebookName);
                } else {
                  window.location.href = `/cuaderno/${notebookName}`;
                }
              }}
            >
              <span>{`${index + 1} -  ${notebookName}`}</span>
              {isLocal && <span style={{ fontSize: "0.7em", backgroundColor: "#eee", padding: "2px 6px", borderRadius: "4px" }}>Local</span>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setIsModalOpen(false)}
          style={{
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer"
          }}
        >
          <X size={18} /> Cerrar
        </button>
      </div>
    </>
  );

  logger.log(notebookList);

  if (inDialog) {
    return <ModalContent />;
  }

  return isModalOpen ? (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Overlay */}
      <div
        style={{
          background: 'rgba(0,0,0,0.18)',
          position: 'absolute',
          inset: 0,
          zIndex: 4000
        }}
        onClick={() => setIsModalOpen(false)}
      />
      {/* Content */}
      <div
        style={{
          background: 'white',
          borderRadius: 8,
          padding: 24,
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          position: 'relative',
          width: '90%',
          maxWidth: 500,
          zIndex: 4001
        }}
      >
        <ModalContent />
      </div>
    </div>
  ) : null;
};

export default NotebookListModal;
