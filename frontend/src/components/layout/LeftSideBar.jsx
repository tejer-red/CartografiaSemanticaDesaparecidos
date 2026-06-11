import React, { useState } from 'react';
import { ChevronDown, Filter, BarChart } from 'lucide-react';
import FilterForm from '../filters/FilterForm';
import FilterFormWrapper from '../filters/FilterFormWrapper';
import FilteredStats from '../filters/FilteredStats';
import { useData } from '../../context/DataContext';
import { useZIndex } from '../../utils/useZIndex';

const accordionStyles = {
  trigger: {
    width: '100%',
    padding: '5px 20px',
    backgroundColor: 'rgb(0, 123, 255)',
    border: 'none',
    borderBottom: '1px solid #e5e5e5',
    fontSize: '15px',
    fontWeight: 500,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer'
  },
  content: {
    backgroundColor: 'white',
    padding: '5px'
  },
  item: {
    overflow: 'hidden',
    marginBottom: '4px',
    background: 'white',
    border: '1px solid #e5e5e5',
    borderRadius: '4px'
  },
  chevron: {
    transition: 'transform 300ms'
  },
  triggerIcon: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }
};

const LeftSideBar = () => {
  const { visibleComponents } = useData();
  const { zIndex, handleClick } = useZIndex('left-sidebar');
  
  // Custom accordion state
  const [openSection, setOpenSection] = useState('filters'); // 'filters', 'stats', or null

  const toggleSection = (section) => {
    setOpenSection(prev => (prev === section ? null : section));
  };

  return (
    <div 
      id="left-sidebar"
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: 5,
        top: 65,
        width: '400px',
        background: 'white',
        padding: '16px',
        zIndex: zIndex,
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
      }}
    >
      <FilterFormWrapper />
      <div>
        {visibleComponents.filterForm && (
          <div style={accordionStyles.item}>
            <button 
              type="button"
              onClick={() => toggleSection('filters')}
              style={accordionStyles.trigger}
              aria-expanded={openSection === 'filters'}
            >
              <div style={accordionStyles.triggerIcon}>
                <Filter size={16} />
                Filtros
              </div>
              <ChevronDown 
                style={{
                  ...accordionStyles.chevron,
                  transform: openSection === 'filters' ? 'rotate(180deg)' : 'rotate(0deg)'
                }} 
                aria-hidden 
              />
            </button>
            {openSection === 'filters' && (
              <div style={accordionStyles.content}>
                <FilterForm />
              </div>
            )}
          </div>
        )}
        
        {visibleComponents.currentState && (
          <div style={accordionStyles.item}>
            <button 
              type="button"
              onClick={() => toggleSection('stats')}
              style={accordionStyles.trigger}
              aria-expanded={openSection === 'stats'}
            >
              <div style={accordionStyles.triggerIcon}>
                <BarChart size={16} />
                Estadísticas
              </div>
              <ChevronDown 
                style={{
                  ...accordionStyles.chevron,
                  transform: openSection === 'stats' ? 'rotate(180deg)' : 'rotate(0deg)'
                }} 
                aria-hidden 
              />
            </button>
            {openSection === 'stats' && (
              <div style={accordionStyles.content}>
                <FilteredStats />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftSideBar;
