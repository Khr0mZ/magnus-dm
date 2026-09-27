# Magnus Laser — Mesa del DM

Versión reducida de `cyber-manager`: una única página en español e inglés con las herramientas del DM y los generadores aleatorios. Conserva el logotipo y la estética cyberpunk de Magnus Laser.

La dirección visual se inspira en Edgerunners: la navegación activa conserva el color de cada sección (lima para la mesa, cian para generadores, magenta para referencias y naranja para el mapa), superficies de negro tinta, señales cian y magenta, cortes diagonales y sombras marcadas. Se aplica a la cabecera, sesiones, oráculo, archivos, herramientas, referencias y registro. Conserva las fuentes Orbitron/Rajdhani, el logo original, su naranja y los fondos de ciudad; el CRT es más sutil y el glitch aparece brevemente al interactuar. El modo lectura comparte todos los componentes con una paleta de papel cálido y tintas oscuras.

## Uso local

Requiere Node.js 22.13 o superior.

```sh
npm ci
npm run dev
```

Abre la dirección que indique el servidor. La página tiene cuatro secciones: Mesa del DM, Generadores, Tablas de referencia y Mapa de Night City. Las herramientas de sesión se cambian dentro de la misma página.

La pantalla empieza directamente con las herramientas, sin footer. La barra superior reúne el logo original sin enlace ni nombre repetido a su lado, el selector editable de sesiones con sus acciones, el selector ES/EN y el cambio Chrome/Flesh para los modos cyberpunk y lectura. En pantallas estrechas la sesión ocupa una segunda fila dentro de la misma cabecera; los formularios de crear y eliminar se despliegan sobre el contenido, sin reservar una barra adicional. Se conserva el renombrado inline, el cambio por sugerencias y el guardado local. Los acentos de Magnus Laser usan el naranja del láser; la página y sus paneles tienen scrollbars personalizados en ambos temas.

El mapa se presenta como Night City **circa 2080**. El mapa y el fondo muestran loaders durante la carga y decodificación de sus imágenes, sin bloquear los controles. El fondo conserva el mismo encuadre y los filtros de color sobre un `picture` nativo, con las variantes Chrome/Flesh y escritorio/móvil; al cambiar de tema o de variante de pantalla se sigue la carga de la nueva imagen. También reconoce las imágenes que ya terminaron de cargar antes de hidratar la página, por ejemplo desde caché, y descarta las notificaciones de fondos anteriores. Los loaders respetan el idioma y el movimiento reducido, y dejan de animarse si falla una imagen.

Los directorios principales y los botones de sesión y favoritos usan superficies por categoría, cortes angulares, barridos de luz y selección iluminada, adaptados de los controles originales de `cyber-manager`. El color ocupa fondos, texto y controles cuando comunica una categoría o estado; los elementos neutros prescinden de bordes decorativos y no se repiten franjas izquierdas. Se conservan los contornos de campos y el foco de teclado. Los desplegables comparten un menú propio, con la flecha junto al valor, navegación por teclado y búsqueda al escribir.

El selector de idioma presenta dos puertos de traducción, ES/Español y EN/English, unidos por una señal animada; conserva sus bordes completos y un diseño distinto de Chrome/Flesh. Las nueve herramientas del DM reutilizan los mismos stacks de archivos, con solapamiento, extracción, arrastre y swipe: naranja para Operaciones, magenta para Preparación y verde para Registros. La herramienta se abre debajo de su categoría y se cierra desde el archivo, con su botón de cierre o con Escape, devolviendo el foco. El panel activo y sus acciones siguen el color del grupo. Los campos, desplegables y acciones de formulario comparten una altura de 48 px y se alinean por su borde inferior.

Las tarjetas muestran su nombre, identificador y favorito, sin pictogramas decorativos ni pies repetidos de «Generar» o número de filas. Se han retirado los rótulos laterales sobre el fondo y los iconos duplicados de cabeceras y herramientas; los controles de acciones conservan sus iconos útiles. Ambos temas comparten esta presentación más ligera.

La navegación funciona como un explorador netrunner: consola para la mesa del DM, circuito para los generadores y banco de datos para las referencias. Generadores y referencias se organizan en stacks horizontales con un solapamiento de 20 px, reducido a 12 px en móvil, y un color por categoría. Los títulos completos quedan visibles sin hover. Cada fila permite arrastre con ratón, swipe nativo, trackpad y teclado; no hay botones de flecha, barra horizontal visible ni paginado. Arrastrar no activa tarjetas ni favoritos por accidente. Hover y foco de teclado extraen un único archivo con barrido de luz, desde zonas fijas que evitan el parpadeo. Todas las filas permanecen abiertas, con cabeceras estáticas; el modo de movimiento reducido elimina las animaciones.

El favorito se representa mediante un chip de memoria: circuito vacío cuando está desactivado y núcleo angular encendido, conectado a sus pistas, cuando está activado. Un breve pulso acompaña la activación, sin marcas de checkbox. Se comparte entre tarjetas, tablas abiertas y filtros, con botones accesibles y estados que se distinguen por forma y color.

Los filtros comparten una barra compacta, sin rejilla decorativa. El directorio de categorías se despliega sobre los archivos, con carpetas por color y animaciones de conexión y barrido. Se cierra al elegir carpeta, pulsar fuera o usar Escape. Ambos exploradores combinan búsqueda, categoría y favoritos. Conservan siempre el orden original del catálogo, sin selector de ordenación. Las referencias buscan también dentro de las tablas y abren un único archivo bajo su stack; Escape lo cierra y devuelve el foco al archivo o a la fila si se ha cambiado el filtro. Los textos tienen un mínimo de 14 px y el contenido principal usa 16–18 px en ambos temas.

## Contenido

- Oráculo cerrado con cinco probabilidades. El oráculo abierto ofrece enfoques de situación, persona, lugar, motivación y descubrimiento, con tablas seleccionables y resultados completos etiquetados. No hay lanzador de dados independiente; las tiradas de la partida se hacen en Foundry.
- Generadores originales en español e inglés, encuentros por zona y hora, y seis generadores de contenido: contactos, encargos, bandas, edificios, recompensas y objetos.
- Referencias originales de combate, heridas, equipo, habilidades, ciberware, netrunning y más, con búsqueda.
- Mission Kit en ES/EN: los 11 quickhacks, acciones y defensas NET, adaptación a RED, conexión directa, reglas de combate y Humanidad. Las referencias indican la variante de reglas y la página impresa del Rule Book. El PDF aportado permanece local e ignorado por Git; no se incluye en la web ni se añade su catálogo de equipo.
- Relojes de reserva de d6, escalada y Suerte del diablo.
- Constructor de misión editable y regeneración por campo.
- Registro de PNJ y fichas, escenas y estructura narrativa.
- Pruebas de investigación, desafíos sociales y puntos de mejora.
- Tablas personales con resultados ponderados.
- Favoritos globales del DM para generadores y referencias, con chips de memoria, filtros y acceso rápido desde la mesa. Historial, resultados fijados, notas y modo lectura.
- Modo claro con ciudad diurna, logo y colores propios. Comparte estructura, superficies, espaciado, fuentes y efectos con el modo cyberpunk; únicamente cambia la paleta y las imágenes.
- Selector ES/EN en la barra superior. Traduce controles, tablas y nuevos resultados; conserva las notas, los campos editados y el historial en su idioma original.
- Cabecera ambientada en Night City, 2080. La interfaz bloquea la selección accidental de texto; los campos editables permiten seleccionar y editar normalmente. Resultados, historial y tablas de referencia se copian con sus botones.

## Guardado

El selector permite crear, renombrar, abrir y eliminar sesiones. El nombre se edita directamente en el campo: Enter o salir del campo guarda, Escape cancela y elegir una sugerencia cambia de sesión sin renombrar la anterior. No hay botón de renombrar ni etiqueta permanente de guardado; los fallos de almacenamiento siguen mostrando su aviso. Cada sesión conserva sus notas, historial, PNJ, relojes, escenas, misión, desafíos, puntos de mejora y tablas propias. La eliminación requiere confirmación dentro de la interfaz y siempre se conserva al menos una sesión. Los formularios pendientes y resultados temporales se reinician al cambiar de sesión; el tema y los favoritos del DM son compartidos.

La biblioteca guarda los favoritos en dos listas globales, `favorites.generators` y `favorites.references`. Al cargar una biblioteca antigua, se combinan sin duplicados los generadores favoritos de todas sus sesiones. Una vez guardada la selección global, los campos antiguos no vuelven a incorporarse: desmarcar todos los favoritos o eliminar una sesión no restaura ni borra preferencias del DM. La mesa muestra todos los favoritos en filas de acceso rápido.

Todo se guarda automáticamente en `localStorage`, con la clave `magnus-dm.sessions.v2`. La sesión anterior de `magnus-dm.session.v1` se incorpora automáticamente al primer uso; la clave antigua permanece como respaldo y no vuelve a importarse si existe la biblioteca nueva. No hay cuentas de la aplicación, base de datos, importación ni exportación. Los datos pertenecen al navegador y al origen donde abres la web: la vista local y el enlace publicado tienen sesiones independientes. Borrar los datos del sitio elimina las sesiones.

Las pestañas mantienen su sesión activa al recibir cambios de otra pestaña y conservan los cambios de las demás sesiones al guardar. Si falta espacio, las ediciones pendientes permanecen en memoria y se bloquea el cambio de sesión hasta reintentar el guardado; recargar o cerrar antes de guardar puede perder esas ediciones pendientes.

El idioma se guarda de forma independiente con la clave `magnus-dm.language`. Cambiarlo no modifica la sesión ni sus identificadores y también se sincroniza entre pestañas.

Los últimos 200 resultados se conservan, además de todos los fijados y de las entradas con marcador en el mapa. La aplicación detecta almacenamiento inaccesible, agotado o corrupto y muestra un aviso. Los generadores funcionan localmente, sin API de IA ni claves. Las seis fichas completas son generadores procedurales; sus estadísticas y detalles editables sirven como punto de partida para el DM.

Regenerar desde el registro o desde el resultado abierto reemplaza esa entrada, manteniendo su identificador, fecha, posición y estado de fijado. Generar desde una tarjeta sigue creando un resultado nuevo. El panel de registro tiene una sola zona de scroll, que incluye toda su superficie; los textos de las entradas se muestran completos, sin scrolls anidados, y al llegar al límite se puede seguir desplazando la página.

## Comprobaciones

```sh
npm test
npm run lint
npm run build
npm run test:render
```

Las pruebas verifican generadores y traducciones, referencias, búsqueda combinada sin tildes, favoritos, fórmulas, límites del oráculo, relojes, probabilidades ponderadas, conservación del estado, eventos de marcadores vinculados al registro y HTML de producción. No sustituyen una prueba manual completa de la interfaz en navegador.

## Estructura

- `app/workbench.tsx`: página, navegación y registro.
- `app/oracle-panel.tsx` y `lib/open-oracle.ts`: oráculos cerrado y abierto, enfoques y selección de fuentes.
- `app/cyber-select.tsx`: desplegables compartidos con teclado y menús sobre el resto de la interfaz.
- `app/generator-explorer.tsx`, `app/reference-explorer.tsx` y `lib/explorer.ts`: carpetas, archivos, filtros y búsquedas.
- `app/dm-tools.tsx`: herramientas de dirección.
- `app/use-session.ts`, `app/session-bar.tsx`, `app/session-picker.tsx` y `lib/session-library.ts`: biblioteca de sesiones, migración, selector editable y guardado en el navegador.
- `lib/engine.ts` y `lib/session.ts`: reglas y estado validado.
- `lib/data/`, `lib/catalog.ts` y `lib/reference.ts`: datos adaptados del proyecto original.
- `lib/mission-kit.ts`: resúmenes bilingües contrastados con el Rule Book de Edgerunners, con fuentes y variantes de reglas diferenciadas.
- `app/globals.css`: diseño responsive y modo lectura.
- `app/cyberpunk.css`: identidad visual original, neones, tipografía y adaptación de la cabecera.
- `app/terminal.css`: cabecera, adaptación de los efectos originales de glitch y scanlines, y fondo de ciudad con el logo real. Respeta la reducción de movimiento y el modo lectura.
- `app/reader.css`: cambios de paleta e imágenes del modo claro; la estructura y los efectos proceden de los estilos compartidos.
- `app/netrunner.css`: explorador de archivos, efectos de hover y selección, tamaños legibles y adaptación a móvil compartidos por ambos temas.
- `app/data-stack.tsx`, `lib/drag-scroll.ts`, `app/favorite-mark.tsx` y `app/stacks.css`: stacks con arrastre, scroll y swipe, marcador de favoritos, directorio compacto, navegación accesible, animaciones de extracción y lector de tablas.
- `app/workspace.css`: selector de sesiones y scrollbar global, con geometría compartida entre temas.
- `app/controls.css`: navegación, botones, selectores, Chrome/Flesh y oráculo, con efectos adaptados del proyecto original.
- `app/edgerunners.css`: dirección visual compartida de Edgerunners, paletas de ambos modos, selección por categoría, superficies, controles, archivos y paneles. Se carga al final; conserva las interacciones y la geometría responsive de las capas anteriores.
- `app/cyber-background.tsx`: fondo estático y overlay CRT, sin lluvia Matrix.
- `app/locale.tsx`, `lib/i18n.ts` y `lib/data/*-en.json`: preferencia de idioma, traducciones y datos originales ingleses.
- `app/fonts.css` y `public/fonts/`: Orbitron, Rajdhani y Share Tech Mono servidas localmente, con sus licencias.

El mapa 2077 se abre desde «Mapa de Night City», la cuarta sección de la mesa, junto a Generadores y Tablas de referencia. Reutiliza el visor local y sigue el idioma ES/EN y el modo Chrome/Flesh de la aplicación, conservando zoom y posición al cambiar de aspecto o sección. Arrastrar una entrada del registro al mapa crea un marcador; pulsarlo permite editar título y contenido de la misma entrada. El botón de mapa de cada entrada permite colocarlo también con toque o teclado. Los marcadores se guardan por sesión; volver a arrastrar mueve el marcador y quitarlo conserva la entrada. Se han excluido simuladores 2D/3D, multijugador, Tauri, GraphQL, gestión de personajes jugadores y servicios de generación por IA. El despliegue usa una exportación estática de Next.js para GitHub Pages, sin almacenamiento remoto.

## Recursos

Las tablas en español e inglés, los colores y los logotipos proceden de `../cyber-manager/client/Magnus-Laser`. No se ha modificado el proyecto original.

`public/og.png` es la tarjeta de presentación para compartir enlaces, creada con ImageGen. Reutiliza la ciudad del fondo oscuro y el logo original en cian y naranja, con el lema «Tu mesa. Tus reglas.»; conserva el contorno hueco del emblema del cartel. Los metadatos Open Graph declaran su tamaño de 1730 × 909 px.

`public/magnus-city.webp` y `public/magnus-city-mobile.webp` son el fondo de página generado con ImageGen a partir del logo real y la dirección artística de la tarjeta, sin textos promocionales. La cabecera utiliza directamente `public/magnus-laser.png`, el original de 1024 × 1024, en ambos temas; el modo lectura ajusta su color con CSS, sin sustituirlo por miniaturas ni reinterpretar el emblema.

El modo lectura utiliza `public/magnus-city-reader-v2.webp` y su variante móvil `public/magnus-city-reader-mobile-v2.webp`. El emblema del cartel mantiene el contorno hueco del fondo oscuro. Son variantes claras creadas con ImageGen.

El mapa reutiliza el origen de Night City Navigator empleado por `cyber-manager`. Los 114.056 tiles de los zooms 11–19 se guardan localmente, sin modificar, en `public/maps/night-city-2077/reading/`, incluidos los niveles de detalle 18 y 19. `manifest.json` conserva cobertura, hashes SHA-256 y atribución: Game data © CD PROJEKT RED; Map © Night City Navigator y colaboradores, [ODbL](https://nightcitynavigator.com/copyright). El descargador inicial se ha retirado porque todos los tiles están incluidos en el repositorio.

`scripts/pack-night-city-map.mjs` forma parte de la compilación: verifica los tiles y publica cada imagen idéntica una sola vez, manteniendo todas las coordenadas mediante un índice. Solo modifica la copia de salida de GitHub Pages, nunca los originales de `public/`.

El visor `maps/night-city-2077/preview.html` permite revisar la versión original para Flesh y una paleta oscura para Chrome, conservando posición, calles y rótulos. Sus recursos y enlaces son relativos para funcionar también bajo la ruta del repositorio. `app/night-city-map.tsx` lo incorpora a la mesa sin duplicar la cabecera ni los controles de aspecto. El editor de marcadores comparte colores, acciones angulares y tipografía con la aplicación.

## GitHub Pages

La app se publica como HTML, CSS y JavaScript estáticos, sin servidor ni secretos. El desarrollo usa Next.js; la configuración y dependencias de Sites/Vinext se han retirado.

```sh
npm run build
npm run test:render
```

La salida estática se genera en `out/` y está preparada para `https://khr0mz.github.io/magnus-dm/`. `build/github-pages.mjs` configura la ruta base, genera los metadatos Open Graph y compacta los tiles. Para otro dominio o ruta se puede establecer `MAGNUS_SITE_URL` antes de compilar; no es una credencial. `lib/asset-path.ts` adapta logo, fondos, favicon y mapa a la ruta elegida. Las fuentes se incluyen en la compilación y el visor del mapa mantiene sus referencias relativas.

Para activar la publicación, selecciona **Settings → Pages → Source: GitHub Actions** en el repositorio. Después ejecuta **Actions → Publish GitHub Pages → Run workflow**. El flujo solo publica cuando se lanza manualmente, tras las pruebas y la compilación; subir un commit no publica la web. No requiere añadir claves a GitHub.

Las sesiones se guardan por origen: las guardadas en Sites siguen allí y no aparecen automáticamente en el nuevo dominio de Pages.

Los cambios se revisan en local. Publicar o actualizar el sitio requiere aprobación explícita del usuario; las modificaciones locales no actualizan la versión publicada.
