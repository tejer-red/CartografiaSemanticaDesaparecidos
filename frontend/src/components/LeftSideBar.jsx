import React from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown, Filter, BarChart } from 'lucide-react';
import FilterForm from './FilterForm';
import FilterFormWrapper from './FilterFormWrapper';
import FilteredStats from './FilteredStats';
import { useData } from '../context/DataContext';
import { useZIndex } from '../utils/useZIndex';

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
      <Accordion.Root 
        type="single" 
        defaultValue="filters"
        collapsible
      >
        {visibleComponents.filterForm && (
          <Accordion.Item style={accordionStyles.item} value="filters">
            <Accordion.Trigger style={accordionStyles.trigger}>
              <div style={accordionStyles.triggerIcon}>
                <Filter size={16} />
                Filtros
              </div>
              <ChevronDown style={accordionStyles.chevron} aria-hidden />
            </Accordion.Trigger>
            <Accordion.Content style={accordionStyles.content}>
              <FilterForm />
            </Accordion.Content>
          </Accordion.Item>
        )}
        
        {visibleComponents.currentState && (
          <Accordion.Item style={accordionStyles.item} value="stats">
            <Accordion.Trigger style={accordionStyles.trigger}>
              <div style={accordionStyles.triggerIcon}>
                <BarChart size={16} />
                Estadísticas
              </div>
              <ChevronDown style={accordionStyles.chevron} aria-hidden />
            </Accordion.Trigger>
            <Accordion.Content style={accordionStyles.content}>
              <FilteredStats />
            </Accordion.Content>
          </Accordion.Item>
        )}
      </Accordion.Root>
    </div>
  );
};

export default LeftSideBar;
