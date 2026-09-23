import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';
import './Breadcrumb.css';

const ROUTE_LABELS = {
  '': 'Inicio',
  'cuaderno': 'Cuadernos',
  'lista': 'Lista de Cuadernos',
  'nuevo': 'Nuevo Cuaderno',
  'contexto': 'Contexto Ontológico',
  'noticias': 'Noticias Periodísticas',
  'grafo': 'Grafo de Relaciones',
  'visible': 'Vista Pública'
};

const Breadcrumb = () => {
  const location = useLocation();
  const path = location.pathname;

  // No renderizar breadcrumbs en la landing page ni en la edición interactiva del cuaderno (usa HeaderCompact)
  if (path === '/' || (path.startsWith('/cuaderno/') && !path.includes('/lista'))) {
    return null;
  }

  const segments = path.split('/').filter(Boolean);

  let accumulatedPath = '';
  const breadcrumbItems = segments.map((segment, index) => {
    accumulatedPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    const label = ROUTE_LABELS[segment] || (segment.length > 12 ? `${segment.substring(0, 8)}...` : segment);

    return {
      label,
      path: accumulatedPath,
      isLast
    };
  });

  return (
    <nav className="breadcrumb-nav-wrapper" aria-label="Navegación contextual">
      <ul className="breadcrumb-list">
        <li className="breadcrumb-item">
          <Link to="/" className="breadcrumb-link" title="Ir al Inicio">
            <Home size={14} />
            <span>Inicio</span>
          </Link>
        </li>
        {breadcrumbItems.map((item, idx) => (
          <React.Fragment key={item.path || idx}>
            <li className="breadcrumb-separator">
              <ChevronRight size={13} />
            </li>
            <li className="breadcrumb-item">
              {item.isLast ? (
                <span className="breadcrumb-current" aria-current="page">{item.label}</span>
              ) : (
                <Link to={item.path} className="breadcrumb-link">
                  {item.label}
                </Link>
              )}
            </li>
          </React.Fragment>
        ))}
      </ul>
      <Link to="/" className="breadcrumb-home-btn">
        <ArrowLeft size={14} />
        <span>Volver al Inicio</span>
      </Link>
    </nav>
  );
};

export default Breadcrumb;
