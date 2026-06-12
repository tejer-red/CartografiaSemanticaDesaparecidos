import React, { useState } from 'react';
import { Plus, MapPin, X, Newspaper } from 'lucide-react';
import { useLocalData } from '../../hooks/useLocalData';
import { useData } from '../../context/DataContext';

const LocalDataFAB = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState(null); // 'fosa', 'noticia'
  const { addLocalFosa, addLocalNoticia } = useLocalData();
  const { refreshLocalData } = useData();
  
  const handleAddFosa = async () => {
    // Basic mock interaction (in reality, we would read map click coordinates)
    const lat = 20.6 + Math.random() * 0.5;
    const lng = -103.3 - Math.random() * 0.5;
    
    try {
      await addLocalFosa({
        lat,
        lng,
        municipio: 'Zapopan (Local)',
        estado: 'Jalisco',
        fecha_hallazgo: new Date().toISOString().split('T')[0]
      });
      refreshLocalData();
      setIsOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddNoticia = async () => {
    const lat = 20.6 + Math.random() * 0.5;
    const lng = -103.3 - Math.random() * 0.5;
    
    try {
      await addLocalNoticia({
        lat,
        lng,
        titular: 'Hallazgo reportado localmente',
        url: 'https://ejemplo.com',
        fecha: new Date().toISOString().split('T')[0]
      });
      refreshLocalData();
      setIsOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
      
      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
          <button 
            onClick={handleAddNoticia}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', cursor: 'pointer', fontWeight: 500 }}
          >
            <Newspaper size={16} color="#e11d48" />
            Noticia Local
          </button>
          <button 
            onClick={handleAddFosa}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', cursor: 'pointer', fontWeight: 500 }}
          >
            <MapPin size={16} color="#6366f1" />
            Fosa Local
          </button>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '28px',
          backgroundColor: isOpen ? '#4b5563' : '#6366f1',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        title="Añadir hallazgo local"
      >
        {isOpen ? <X size={24} /> : <Plus size={24} />}
      </button>
    </div>
  );
};

export default LocalDataFAB;
