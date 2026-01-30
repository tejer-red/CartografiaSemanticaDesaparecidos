import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';

const NotebookListModal = ({
  isModalOpen,
  setIsModalOpen,
  notebookList = [],
  onSelectNotebook,
  title = "Cuadernos Disponibles",
  inDialog = false
}) => {
  const isMobile = useIsMobile();

  const ModalContent = () => (
    <>
      <Dialog.Title style={{ fontWeight: 600, fontSize: 22, marginBottom: 20 }}>
        {title}
      </Dialog.Title>
      <div style={{ maxHeight: isMobile ? "none" : "400px", overflowY: "auto" }}>
        {notebookList.map((notebook, index) => (
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
              console.log("Selected notebook:", notebook);
              window.location.href = `/dist/cuaderno/${notebook}`;
            }}
          >
            <span>{`${index + 1} -  ${notebook}`}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <Dialog.Close asChild>
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
        </Dialog.Close>
      </div>
    </>
  );

  console.log(notebookList);

  if (inDialog) {
    return <ModalContent />;
  }

  return isModalOpen ? (
    <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
      <Dialog.Portal>
        <Dialog.Overlay style={{
          background: 'rgba(0,0,0,0.18)',
          position: 'fixed',
          inset: 0,
          zIndex: 16000, // Por encima de InitialModal (15000) y otros modales
        }} />
        <Dialog.Content style={{
          background: 'white',
          borderRadius: isMobile ? 0 : 8,
          padding: 24,
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          position: 'fixed',
          top: isMobile ? 0 : '50%',
          left: isMobile ? 0 : '50%',
          transform: isMobile ? 'none' : 'translate(-50%, -50%)',
          width: isMobile ? '100vw' : '90%',
          height: isMobile ? '100vh' : 'auto',
          maxWidth: isMobile ? 'none' : 500,
          maxHeight: isMobile ? 'none' : '90vh',
          overflowY: 'auto',
          zIndex: 16001, // Por encima del overlay
        }}>
          <ModalContent />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  ) : null;
};

export default NotebookListModal;
