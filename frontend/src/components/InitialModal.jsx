import React, { useState, useEffect, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useData } from '../context/DataContext';
import { API_BASE_URL } from '../config';
import { MapPin, Download, BookOpen } from 'lucide-react';
import NotebookListModal from './NotebookListModal';

const InitialModal = ({
  handleSubmit,
  fetchCedulas,
  setFetchCedulas,
  fetchForense,
  setFetchForense,
  fetchFosas,
  setFetchFosas,
  isNotebookRoute,
  listNotebooksApp,
}) => {
  const { startDate, endDate, setStartDate, setEndDate, loading } = useData();
  const [open, setOpen] = useState(true);
  const [showingNotebooks, setShowingNotebooks] = useState(false);
  const [notebooks, setNotebooks] = useState([]);

  const [localStartDate, setLocalStartDate] = useState(startDate || '');
  const [localEndDate, setLocalEndDate] = useState(endDate || '');

  useEffect(() => {
    if (startDate) setLocalStartDate(startDate);
    if (endDate) setLocalEndDate(endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    console.log(`Estás en modo: ${isNotebookRoute ? 'Edición de cuaderno' : 'Nuevo cuaderno'}`);
  }, [isNotebookRoute]);

  const handleFormSubmit = useCallback(async (e) => {
    e.preventDefault();
    setStartDate(localStartDate);
    setEndDate(localEndDate);
    await handleSubmit(e);
    setOpen(false);
  }, [localStartDate, localEndDate, setStartDate, setEndDate, handleSubmit]);

  const handleListNotebooks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notebooks`);
      if (!response.ok) throw new Error('Failed to fetch notebooks');
      const data = await response.json();
      if (data.success) {
        setNotebooks(data.notebooks);
        setShowingNotebooks(true);
      }
    } catch (error) {
      console.error('Error fetching notebooks:', error);
    }
  };

  return (
    <Dialog.Root open={open} modal>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            background: 'rgba(0, 0, 0, 0.55)',
            position: 'fixed',
            inset: 0,
            zIndex: 1000
          }}
        />
        <Dialog.Content
          style={{
            background: 'white',
            borderRadius: 8,
            boxShadow: '0 10px 38px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.2)',
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: 24,
            width: '100%',
            maxWidth: 700,
            zIndex: 1001
          }}
        >
          {!showingNotebooks ? (
            <>
              <Dialog.Title style={{ fontWeight: 600, fontSize: 22, marginBottom: 20 }}>
                {isNotebookRoute ? 'Navegación de Datos' : 'Nueva Exploración'}
              </Dialog.Title>

              <div style={{ marginBottom: 24, color: '#333', fontSize: '16px', lineHeight: '1.4' }}>
                {isNotebookRoute ? (
                  <p>
                    Para explorar este análisis existente, necesitará descargar los datos.
                    Una vez cargados, haga clic en el botón <MapPin size={16} style={{ verticalAlign: 'middle' }} />
                    <strong>"Bitácora de navegación"</strong> en el lateral derecho para visualizar el análisis completo.
                  </p>
                ) : (
                  <p>
                    Inicie una nueva exploración de casos de personas desaparecidas seleccionando
                    un período de tiempo. Los datos se mostrarán en el mapa para su análisis detallado.
                  </p>
                )}
              </div>

              <form onSubmit={handleFormSubmit} className="">
                <div className="">
                  <div className="date-inputs" style={{ marginBottom: 12 }}>
                    <label>
                      Fecha de inicio:
                      <input
                        type="date"
                        value={localStartDate}
                        onChange={(e) => setLocalStartDate(e.target.value)}
                        required
                      />
                    </label>
                    <label>
                      Fecha final:
                      <input
                        type="date"
                        value={localEndDate}
                        onChange={(e) => setLocalEndDate(e.target.value)}
                        required
                      />
                    </label>
                  </div>
                  <div className="checkbox-group" style={{ marginBottom: 12 }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={fetchCedulas}
                        onChange={(e) => setFetchCedulas(e.target.checked)}
                      />
                      Obtener Cédulas
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={fetchForense}
                        onChange={(e) => setFetchForense(e.target.checked)}
                      />
                      Obtener Forense
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={fetchFosas}
                        onChange={(e) => setFetchFosas(e.target.checked)}
                      />
                      Obtener Fosas
                    </label>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px'
                      }}
                    >
                      <Download size={18} />
                      {loading ? 'Cargando...' : 'Obtener Datos'}
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: 20, borderTop: '1px solid #eee', paddingTop: 20 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 12 }}>
                    {isNotebookRoute ? 'Cuaderno Cargado' : 'Cargar Cuaderno Existente'}
                  </h3>

                  {isNotebookRoute ? (
                    <p style={{
                      color: '#666',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      marginBottom: '16px'
                    }}>
                      Estás cargando un cuaderno de análisis previo que te permitirá visualizar una
                      investigación específica. Si deseas explorar otros cuadernos disponibles,
                      haz clic en "Listar Cuadernos".
                    </p>
                  ) : (
                    <p style={{
                      color: '#666',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      marginBottom: '16px'
                    }}>
                      Los cuadernos son herramientas que permiten guardar y compartir configuraciones
                      específicas del mapa, incluyendo filtros aplicados, niveles de zoom, rangos de fechas
                      y ubicaciones particulares. Además, almacenan "migas de pan" o estados que facilitan
                      la navegación paso a paso, ayudando a encontrar y documentar evidencia en casos específicos
                      de manera sistemática y reproducible.
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={handleListNotebooks}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px'
                      }}
                    >
                      <BookOpen size={18} />
                      Listar Cuadernos
                    </button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            <NotebookListModal
              isModalOpen={showingNotebooks}
              setIsModalOpen={setShowingNotebooks}
              notebookList={notebooks}
              onSelectNotebook={(notebook) => {
                console.log('Selected notebook:', notebook);
                window.location.href = `/dist/cuaderno/${notebook.id}`;
              }}
              inDialog={true}
              title="Seleccionar Cuaderno"
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default InitialModal;
