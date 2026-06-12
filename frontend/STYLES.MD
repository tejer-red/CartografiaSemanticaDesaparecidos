# Sistema de Diseño (Simple Design)

Este documento define las reglas de estilo y clases CSS utilizadas en el proyecto para mantener una apariencia limpia, funcional y sin dependencias externas complejas.

## Filosofía de Diseño
El diseño de la Cartografía Semántica es **sencillo y utilitario**. Prioriza la claridad de la información (el mapa y los datos) sobre la ornamentación visual. Los paneles y controles utilizan bordes claros, fondos sólidos y tipografía legible.

## Variables CSS (`index.css`)
Las variables principales se definen en la pseudoclase `:root` para asegurar consistencia en colores y espaciados:

```css
:root {
  --bg-color: #ffffff;          /* Fondo principal de paneles */
  --text-color: #333333;        /* Texto principal */
  --text-muted: #666666;        /* Texto secundario o descriptivo */
  --border-color: #cccccc;      /* Bordes de paneles y formularios */
  --border-radius: 8px;         /* Redondeo estándar */
  --primary-color: #007bff;     /* Azul para botones primarios y acciones */
  --primary-hover: #0056b3;     /* Azul oscuro para hover */
  --danger-color: #dc3545;      /* Rojo para acciones destructivas */
  --panel-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* Sombra suave para separar del mapa */
}
```

## Componentes Nativos
Como no se utilizan librerías de UI externas (ej. Radix UI), los elementos HTML estándar están estilizados globalmente:

### Botones (`button`)
- Fondo: `--primary-color` para botones de acción.
- Color de texto: Blanco.
- Bordes: Sin bordes gruesos, esquinas redondeadas (`border-radius: 4px`).
- Estado deshabilitado: Fondo gris (`#cccccc`) y cursor de no permitido.

### Entradas de texto y rangos (`input`, `select`)
- Bordes: Sólidos y finos (`1px solid #ccc`).
- Padding: Cómodo para interactuar (ej. `0.5rem`).
- Enfoque (`:focus`): Contorno sutil del color primario.

### Formularios y Agrupaciones (`fieldset`, `legend`)
- `fieldset`: Utilizados para agrupar filtros lógicos. Poseen un borde gris sutil y márgenes internos.
- `legend`: Texto en negrita integrado en el borde superior del fieldset.

## Clases Utilitarias Principales

- `.MapForms`: Panel principal lateral para filtros. Flota sobre el mapa con fondo blanco y opacidad total para evitar distracciones visuales.
- `.HeaderCompact`: Barra superior con fondo blanco y un borde inferior gris sutil.
- `.BottomTimelinePanel`: Contenedor para el control de tiempo en la parte inferior, con la misma estética de panel blanco con borde.
- `.accordion-trigger`: Clase (o equivalente en línea) para botones que despliegan secciones. Fondo azul plano (`#007bff`) con texto blanco, útil para diferenciar áreas clicables.

## Recomendaciones al añadir nuevos componentes
1. **Evitar inline-styles** para reglas generales de apariencia. Preferir el uso de clases en `index.css` o archivos CSS dedicados (ej. `FilterForm.css`).
2. **Reutilizar variables CSS** (`var(--border-color)`, `var(--primary-color)`) en lugar de colores "duros" (hardcoded).
3. Mantener el fondo blanco sólido para asegurar la máxima legibilidad de los textos y gráficos frente al fondo del mapa.
