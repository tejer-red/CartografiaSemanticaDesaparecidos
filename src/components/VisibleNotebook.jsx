import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useNotebook } from '../utils/notebook';
import MapComponent from './MapComponent';
import NotebookListModal from './NotebookListModal';
import { ChevronRight, Home, Map as MapIcon, Calendar, Info } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';
import '../styles/VisibleNotebook.css';

const VisibleNotebook = () => {
    const { id } = useParams();
    const isMobile = useIsMobile();
    const dataContext = useData();
    const { setFetchId, startDate, endDate, mapLoaded, setVisibleComponents, map } = dataContext;

    // Hook de notebook para cargar y manejar las notas
    const {
        notes,
        loadNotesFromBackend,
        restoreState,
        formatTimestamp,
        listNotebooks,
        isModalOpen,
        setIsModalOpen,
        notebookList,
    } = useNotebook(dataContext, id);

    const [notebookName, setNotebookName] = useState('Cargando...');

    useEffect(() => {
        if (id) {
            loadNotesFromBackend(id);
        }
    }, [id, loadNotesFromBackend]);

    // Trigger automático de descarga de datos una vez que tenemos las fechas del cuaderno
    useEffect(() => {
        if (startDate && endDate && mapLoaded) {
            console.log('VisibleNotebook: triggering auto-fetch for', startDate, endDate);
            setFetchId(prev => prev + 1);
        }
    }, [startDate, endDate, mapLoaded, setFetchId]);

    return (
        <div className="visible-notebook-container">
            {/* Columna 1 (50%): Puntos de interés (Contenido) */}
            <main className="visible-content-column">
                <div className="fixed-header-content">
                    <nav className="breadcrumbs" aria-label="Breadcrumb">
                        <ol>
                            <li>
                                <Link to="/"><Home size={16} /> Inicio</Link>
                            </li>
                            <ChevronRight size={14} className="separator" />
                            <li>
                                <button
                                    onClick={listNotebooks}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        color: '#0984e3',
                                        cursor: 'pointer',
                                        font: 'inherit',
                                        textDecoration: 'none'
                                    }}
                                >
                                    Cuadernos
                                </button>
                            </li>
                            <ChevronRight size={14} className="separator" />
                            <li className="active">
                                {id}
                            </li>
                        </ol>
                    </nav>

                    <header className="notebook-header">
                        <h1>{id}</h1>
                        <div className="notebook-meta">
                            <span><Calendar size={14} /> {startDate} - {endDate}</span>
                        </div>
                    </header>
                </div>

                <div className="notes-list-scroll">
                    {notes.length === 0 ? (
                        <p className="empty-msg">No hay notas en este cuaderno.</p>
                    ) : (
                        notes.map((note) => {
                            // Extraer título (primera línea con #) y cuerpo
                            const lines = note.text.trim().split('\n');
                            const title = lines[0].startsWith('# ') ? lines[0].replace('# ', '') : 'Nota de Análisis';
                            const bodyText = lines.slice(1).join('\n');

                            return (
                                <article key={note.id} className="note-card">
                                    <header className="note-card-header">
                                        <div className="note-title-group">
                                            <h2>{title}</h2>
                                            {note.state && (
                                                <button
                                                    className="btn-restore-mini"
                                                    onClick={() => {
                                                        console.log('VisibleNotebook: Restore click', note.id);
                                                        restoreState(note.state);
                                                        if (isMobile) {
                                                            // Intentar scroll en ventana y contenedor
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                            const container = document.querySelector('.visible-notebook-container');
                                                            if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }
                                                    }}
                                                    title="Ver este marcador en el mapa"
                                                >
                                                    <MapIcon size={16} />
                                                </button>
                                            )}
                                        </div>
                                        <span className="note-date">{formatTimestamp(note.timestamp)}</span>
                                    </header>
                                    <div
                                        className="note-body"
                                        dangerouslySetInnerHTML={{
                                            __html: bodyText.trim()
                                                .replace(/^---$/gm, '<hr />')
                                                .replace(/<details>/g, '<div class="note-accordion-wrap"><details>') // Cerrados por default
                                                .replace(/<\/details>/g, '</details></div>')
                                                .replace(/\n\n/g, '</p><p>')
                                                .replace(/\n/g, '<br class="small-br" />')
                                        }}
                                    />
                                </article>
                            );
                        })
                    )}
                </div>
            </main>

            {/* Columna 2 (50%): Espacio para el mapa de fondo */}
            <section className="visible-map-column">
                {/* El mapa de fondo se posicionará aquí vía CSS */}
            </section>

            <NotebookListModal
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                notebookList={notebookList}
                onSelectNotebook={(notebook) => {
                    window.location.href = `/dist/visible/${notebook}`;
                }}
            />
        </div>
    );
};

export default VisibleNotebook;
