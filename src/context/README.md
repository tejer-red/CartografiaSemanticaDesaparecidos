# Documentación de Contextos Modulares

Este directorio contiene los contextos de React que gestionan el estado global de la aplicación. Se organizan por dominio para facilitar mantenibilidad y reducir re-renders innecesarios.

---

## 📁 Estructura de Archivos

```
src/context/
├── index.js              # Exportaciones centralizadas
├── DataContext.jsx       # [LEGACY] Contexto original (compatibilidad)
├── MapContext.jsx        # Estado del mapa y layers
├── FiltersContext.jsx    # Filtros de búsqueda
├── TimelineContext.jsx   # Línea de tiempo y fechas
├── UIContext.jsx         # Estado de UI (loading, visibilidad)
├── RecordsContext.jsx    # Datos de cédulas y forenses
├── ToastContext.jsx      # Sistema de notificaciones
└── ErrorBoundary.jsx     # Manejo de errores en componentes
```

---

## 🔄 Diagrama de Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────────┐
│                           main.jsx                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      ToastProvider                            │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │                    DataProvider                       │    │   │
│  │  │  (contiene: MapContext + FiltersContext + etc.)      │    │   │
│  │  │                                                       │    │   │
│  │  │   ┌───────────────┐    ┌────────────────────┐       │    │   │
│  │  │   │   App.jsx     │───▶│  FetchCedulas.jsx  │       │    │   │
│  │  │   └───────────────┘    └─────────┬──────────┘       │    │   │
│  │  │          │                       │                    │    │   │
│  │  │          │              setFetchedRecords()          │    │   │
│  │  │          │                       ▼                    │    │   │
│  │  │          │             ┌──────────────────┐          │    │   │
│  │  │          │             │  DataContext     │          │    │   │
│  │  │          │             │  (fetchedRecords)│          │    │   │
│  │  │          │             └────────┬─────────┘          │    │   │
│  │  │          │                      │                     │    │   │
│  │  │          ▼                      ▼                     │    │   │
│  │  │   ┌─────────────┐     ┌──────────────────┐          │    │   │
│  │  │   │ MapComponent│◀────│ updateLayerData()│          │    │   │
│  │  │   └─────────────┘     └──────────────────┘          │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Contextos Detallados

### 1. MapContext.jsx

**Propósito:** Gestiona todo lo relacionado con MapLibre GL.

#### Estados

| Estado | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `map` | MapLibre Instance | `null` | Instancia del mapa |
| `cedulaLayer` | Object | `null` | Layer de marcadores de cédulas |
| `forenseLayer` | Object | `null` | Layer de marcadores forenses |
| `mapLoaded` | Boolean | `false` | Flag: mapa completamente cargado |
| `mapType` | String | `'point'` | Tipo de visualización: `'point'` \| `'heatmap'` \| `'cluster'` |
| `activeHeatmapCategories` | Array | `[]` | Categorías visibles en modo heatmap |

#### Constantes Exportadas

| Constante | Descripción |
|-----------|-------------|
| `COLORS` | Paleta de colores por categoría (MUJER, HOMBRE, CON_VIDA, etc.) |
| `POINT_RADIUS` | Radio base para marcadores (30px) |

#### Funciones

| Función | Parámetros | Descripción |
|---------|------------|-------------|
| `addTooltip(layerId)` | ID del layer | Agrega eventos de hover y click para mostrar popups |

#### Componentes que lo usan

- `MapComponent.jsx` → Inicializa el mapa y llama `setMap()`
- `FetchCedulas.jsx` → Llama `updateLayerData()` con datos de cédulas
- `FetchForense.jsx` → Llama `updateLayerData()` con datos forenses
- `LayoutForm.jsx` → Modifica `mapType` para cambiar visualización

#### Hook de acceso

```javascript
import { useMap } from '../context';
const { map, mapType, setMapType, COLORS } = useMap();
```

---

### 2. FiltersContext.jsx

**Propósito:** Gestiona los filtros que afectan qué datos se muestran.

#### Estados

| Estado | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `selectedSexo` | Array | `['HOMBRE', 'MUJER']` | Sexos a mostrar |
| `selectedCondicion` | Array | `['CON VIDA', 'SIN VIDA', 'NO APLICA']` | Condiciones a mostrar |
| `edadRange` | Array[2] | `[0, 100]` | Rango de edad [min, max] |
| `sumScoreRange` | Array[2] | `[0.5, 20]` | Rango de score de violencia |

#### Funciones

| Función | Parámetros | Descripción |
|---------|------------|-------------|
| `resetFilters()` | - | Restaura todos los filtros a valores por defecto |
| `hasActiveFilters()` | - | Retorna `true` si hay algún filtro activo |

#### Componentes que lo usan

- `FilterForm.jsx` → Modifica todos los filtros
- `GlobalTimeGraph.jsx` → Lee `selectedSexo`, `selectedCondicion` para las líneas
- `FilteredStats.jsx` → Muestra estadísticas según filtros
- `CrossRef.jsx` → Usa filtros para el algoritmo de matching

#### Flujo de datos

```
FilterForm.jsx                    GlobalTimeGraph.jsx
     │                                   │
     │ setSelectedSexo(['MUJER'])        │
     ▼                                   │
FiltersContext                           │
     │                                   │
     │ selectedSexo = ['MUJER']          │
     ├───────────────────────────────────┘
     │
     ▼
MapComponent.jsx
     │
     │ Aplica filtro al layer
     ▼
Solo se ven marcadores de MUJER
```

#### Hook de acceso

```javascript
import { useFilters } from '../context';
const { selectedSexo, setSelectedSexo, edadRange, resetFilters } = useFilters();
```

---

### 3. TimelineContext.jsx

**Propósito:** Gestiona la navegación temporal y la reproducción automática.

#### Estados

| Estado | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `startDate` | String | `'2023-01-01'` | Fecha inicio de consulta API |
| `endDate` | String | `'2024-01-01'` | Fecha fin de consulta API |
| `selectedDate` | Date \| null | `null` | Fecha seleccionada en timeline |
| `daysRange` | Number | `30` | Días a mostrar desde selectedDate |
| `timeScale` | String | `'monthly'` | Escala: `'daily'` \| `'weekly'` \| `'bi-weekly'` \| `'monthly'` \| `'yearly'` |
| `isTimelinePlaying` | Boolean | `false` | Reproducción automática activa |
| `timelineVelocity` | Number | `1000` | Milisegundos entre frames |
| `timelinePanelOpen` | Boolean | `true` | Panel de timeline expandido |
| `timelineData` | Array | `[]` | Datos procesados para el gráfico |

#### Funciones

| Función | Parámetros | Descripción |
|---------|------------|-------------|
| `calculateDateRange(date)` | Date | Calcula rango {start, end} según daysRange |

#### Flujo de datos

```
DateFormCompact.jsx                 GlobalTimeGraph.jsx
     │                                     │
     │ setStartDate('2024-01-01')          │
     │ setEndDate('2024-06-01')            │
     ▼                                     │
TimelineContext                            │
     │                                     │
     │                    timeScale ───────┘
     │                                     
     ├─────────────────────────────────────┐
     │                                     │
     ▼                                     ▼
FetchCedulas.jsx                    processMapData()
     │                                     │
     │ Consulta API con fechas             │ Agrupa por timeScale
     ▼                                     ▼
specificDate.php                    timelineData = [...]
     │                                     │
     │ Retorna registros                   │
     ▼                                     ▼
DataContext                         LineChart renderiza
```

#### Hook de acceso

```javascript
import { useTimeline } from '../context';
const { startDate, setStartDate, selectedDate, timeScale } = useTimeline();
```

---

### 4. UIContext.jsx

**Propósito:** Gestiona estados de la interfaz de usuario.

#### Estados

| Estado | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `loading` | Boolean | `false` | Indica operación en progreso |
| `visibleComponents` | Object | `{filterForm: true, currentState: true}` | Visibilidad de componentes |
| `colorScheme` | String | `'sexo'` | Esquema de colores: `'sexo'` \| `'condicion'` |
| `newDataFetched` | Boolean | `false` | Flag: datos de cédulas actualizados |
| `newForenseDataFetched` | Boolean | `false` | Flag: datos forenses actualizados |

#### Funciones

| Función | Parámetros | Descripción |
|---------|------------|-------------|
| `toggleComponent(name)` | String | Alterna visibilidad de un componente |

#### Componentes que lo usan

- `App.jsx` → Muestra loading overlay
- `HeaderPanel.jsx` → Controla visibilidad de componentes
- `LayoutForm.jsx` → Modifica `colorScheme`
- `FetchCedulas.jsx` → Activa `setNewDataFetched(true)` tras fetch

#### Hook de acceso

```javascript
import { useUI } from '../context';
const { loading, setLoading, colorScheme, toggleComponent } = useUI();
```

---

### 5. RecordsContext.jsx

**Propósito:** Almacena los datos obtenidos de la API.

#### Estados

| Estado | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `fetchedRecords` | Array | `[]` | Cédulas de búsqueda (personas desaparecidas) |
| `forenseRecords` | GeoJSON FeatureCollection | `[]` | Registros forenses (PFSI) |
| `mergedRecords` | Array | `[]` | Combinación para timeline |

#### Funciones

| Función | Parámetros | Retorno | Descripción |
|---------|------------|---------|-------------|
| `mergeRecords(cedulas, forenses)` | Arrays | Combined Array | Combina ambos datasets |
| `clearRecords()` | - | - | Limpia todos los registros |
| `getRecordCounts()` | - | `{cedulas, forenses, total}` | Conteo de registros |

#### Flujo de datos

```
FetchCedulas.jsx                    FetchForense.jsx
     │                                   │
     │ fetch(specificDate.php)           │ fetch(sininden.php)
     ▼                                   ▼
API Response                         API Response
     │                                   │
     │ setFetchedRecords([...])          │ setForenseRecords({...})
     ▼                                   ▼
RecordsContext                       RecordsContext
     │                                   │
     └───────────────┬───────────────────┘
                     │
                     ▼
              mergeRecords()
                     │
                     ▼
              mergedRecords
                     │
                     ▼
         GlobalTimeGraph.jsx (timeline)
         CrossRef.jsx (matching)
```

#### Hook de acceso

```javascript
import { useRecords } from '../context';
const { fetchedRecords, forenseRecords, getRecordCounts } = useRecords();
```

---

### 6. ToastContext.jsx

**Propósito:** Sistema de notificaciones no bloqueantes.

#### Métodos del hook

| Método | Parámetros | Descripción |
|--------|------------|-------------|
| `toast.success(message, duration?)` | String, Number | Notificación verde de éxito |
| `toast.error(message, duration?)` | String, Number | Notificación roja de error |
| `toast.info(message, duration?)` | String, Number | Notificación azul informativa |
| `toast.warning(message, duration?)` | String, Number | Notificación amarilla de advertencia |

#### Ejemplo de uso

```javascript
import { useToast } from '../context';

const MyComponent = () => {
  const toast = useToast();
  
  const handleSave = async () => {
    try {
      await saveData();
      toast.success('Datos guardados correctamente');
    } catch (error) {
      toast.error('Error al guardar: ' + error.message);
    }
  };
};
```

---

## 🔗 Relaciones entre Contextos

```
┌────────────────────────────────────────────────────────────────┐
│                         App.jsx                                 │
│                            │                                    │
│         ┌──────────────────┼──────────────────┐                │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│  │   Filters   │   │   Timeline  │   │    Map      │          │
│  │   Context   │   │   Context   │   │   Context   │          │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘          │
│         │                  │                  │                 │
│         │    ┌─────────────┴────────┐        │                 │
│         │    │                      │        │                 │
│         ▼    ▼                      ▼        ▼                 │
│  ┌────────────────┐         ┌────────────────────┐            │
│  │  FilterForm    │         │  GlobalTimeGraph   │            │
│  └───────┬────────┘         └─────────┬──────────┘            │
│          │                            │                        │
│          │ selectedSexo              │ selectedDate           │
│          │ edadRange                 │ timeScale              │
│          ▼                            ▼                        │
│  ┌─────────────────────────────────────────────────┐          │
│  │           filterMarkersByDate()                  │          │
│  │           (en DataContext.jsx)                   │          │
│  └──────────────────────┬──────────────────────────┘          │
│                         │                                      │
│                         ▼                                      │
│                  ┌─────────────┐                               │
│                  │ MapComponent│                               │
│                  │ (marcadores │                               │
│                  │  filtrados) │                               │
│                  └─────────────┘                               │
└────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Migración Gradual

### Antes (usando DataContext monolítico)

```javascript
import { useData } from './context/DataContext';

const MyComponent = () => {
  const { 
    map, 
    selectedSexo, 
    startDate, 
    loading,
    fetchedRecords 
  } = useData();
  
  // Componente con muchas dependencias
  // Se re-renderiza cuando CUALQUIER estado cambia
};
```

### Después (usando contextos modulares)

```javascript
import { useMap } from './context/MapContext';
import { useFilters } from './context/FiltersContext';
import { useTimeline } from './context/TimelineContext';

const MyComponent = () => {
  const { map } = useMap();           // Solo re-render si map cambia
  const { selectedSexo } = useFilters(); // Solo re-render si filtros cambian
  const { startDate } = useTimeline();   // Solo re-render si timeline cambia
  
  // Componente con dependencias específicas
  // Re-renders optimizados
};
```

---

## 📋 Checklist de Migración

Para migrar un componente a contextos modulares:

1. [ ] Identificar qué estados usa del `DataContext`
2. [ ] Clasificar cada estado por contexto:
   - Mapa → `useMap`
   - Filtros → `useFilters`
   - Fechas/Timeline → `useTimeline`
   - UI → `useUI`
   - Datos → `useRecords`
3. [ ] Reemplazar `useData()` por hooks específicos
4. [ ] Verificar que el componente siga funcionando
5. [ ] Ejecutar tests: `npm run test:run`

---

## 🧪 Tests

Los contextos tienen tests en `src/test/`:

```bash
npm run test:run
```

Para agregar tests a un contexto nuevo:

```javascript
// src/test/filters.test.js
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { FiltersProvider, useFilters } from '../context/FiltersContext';

describe('FiltersContext', () => {
  it('should reset filters to defaults', () => {
    const wrapper = ({ children }) => <FiltersProvider>{children}</FiltersProvider>;
    const { result } = renderHook(() => useFilters(), { wrapper });
    
    act(() => {
      result.current.setSelectedSexo(['MUJER']);
      result.current.resetFilters();
    });
    
    expect(result.current.selectedSexo).toEqual(['HOMBRE', 'MUJER']);
  });
});
```
