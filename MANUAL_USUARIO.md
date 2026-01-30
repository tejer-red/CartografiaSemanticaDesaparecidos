# Manual de Usuario: Cartografía Semántica de Desaparecidos

Bienvenido al manual de uso de la herramienta **Cartografía Semántica de Desaparecidos**. Este sistema permite visualizar, filtrar y documentar patrones de desapariciones mediante un mapa interactivo y un sistema de bitácoras.

---

## 1. Inicio de una sesión

Al abrir la aplicación, se presenta el modal **"Nueva Exploración"** (o **"Navegación de Datos"** si vienes de un enlace compartido).

1.  **Configuración de Fechas**: Define el rango temporal usando **"Fecha de inicio"** y **"Fecha final"**.
2.  **Fuentes de Datos**: Activa **"Obtener Cédulas"** y/o **"Obtener Forense"** según tu necesidad.
3.  **Carga**: Haz clic en el botón **"Obtener Datos"** (con el icono de descarga) para cargar la información en el mapa.
4.  **Cuadernos existentes**: Si prefieres retomar un análisis previo, usa el botón **"Listar Cuadernos"** al final del modal.

---

## 2. Filtros de Datos

En el panel lateral izquierdo, dentro del acordeón **"Filtros"**, puedes refinar la información:

-   **Sexo**: Filtra por registros de **"Hombre"** o **"Mujer"**.
-   **Condición de Localización**: Permite elegir entre registros **"Con Vida"**, **"Sin Vida"** o **"No Aplica"**.
-   **Edad de Desaparición**: Selector de rango (de 0 a 100 años).
-   **Score de Violencia**: Ajusta el rango de severidad detectado semánticamente (de 0.5 a 20).

El mapa y la pestaña de **"Estadísticas"** se actualizan automáticamente al modificar estos valores.

---

## 3. Bitácora de navegación

El panel derecho contiene la **"Bitácora de navegación"**, fundamental para documentar hallazgos.

### Marcar Navegaciones y Notas
1.  **Título**: Escribe un encabezado en **"Título de la nota..."**.
2.  **Descripción**: Detalla tu observación en **"Nota de texto..."**.
3.  **Guardar con Estado**: Haz clic en **"Marcar Navegación"** para guardar la nota JUNTO con la posición del mapa (zoom/centro) y los filtros activos.
4.  **Guardar solo Texto**: Haz clic en **"Nota de Texto"** para añadir un comentario sin capturar el estado del mapa.

### Navegar por los Marcadores
*   Cada nota con estado mostrará el botón **"Ir a marcador"** (con una flecha a la izquierda). Al pulsarlo, el mapa regresará exactamente a la vista y filtros que tenías al crear la nota.
*   Puedes eliminar notas con el botón **"🗑️"**.

---

## 4. Guardar y Compartir Cuadernos

Las notas se guardan localmente en tu navegador, pero deben subirse para ser permanentes o compartidas.

### Guardar en el Servidor
1.  En la parte inferior de la Bitácora, haz clic en **"Guardar cuaderno en servidor"**.
2.  Asigna un nombre descriptivo al cuaderno.
3.  Una vez guardado, el botón cambiará a **"Guardar nueva copia"** para versiones posteriores.

### Compartir Enlaces
1.  Al guardar, la URL del navegador cambiará para incluir el ID: `.../cuaderno/[ID]`.
2.  Copia esta URL completa para enviarla a otros colaboradores.
3.  Quien abra el enlace verá el mismo rango de fechas y todas las notas que guardaste, con la capacidad de usar los botones **"Ir a marcador"**.

### Listar Cuadernos
*   Usa el botón **"Listar cuadernos"** dentro del panel de Bitácora para explorar otros trabajos guardados en el servidor.

---

## 5. Referencias Visuales

Utiliza estas imágenes para ubicar los controles principales:

> [!NOTE] 
> **[Imagen de Referencia: Filtros y Estadísticas]**
> *Muestra el panel izquierdo con el acordeón de Filtros abierto.*

> [!NOTE]
> **[Imagen de Referencia: Panel de Bitácora]**
> *Muestra el panel derecho con las entradas de texto, los botones de "Marcar Navegación" y la lista de notas guardadas.*

---

## Recomendaciones
-   **Contexto Automático**: Al usar **"Marcar Navegación"**, la herramienta genera automáticamente un snippet de contexto (fechas, filtros activos, zoom) dentro de la nota.
-   **Fallas de Carga**: Si el mapa no muestra puntos, verifica que las fechas en la cabecera sean correctas o intenta usar **"Obtener Datos"** nuevamente.
