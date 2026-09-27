# Night City 2077: base local

El mapa 2077 de `../cyber-manager/client/Magnus-Laser/src/components/common/Map/Map.tsx` usa Leaflet, la proyección EPSG:3857 y tiles PNG remotos de Night City Navigator. No hay una copia de esos tiles en `cyber-manager`: `public/map` contiene únicamente los mapas de RED, sus distritos y marcadores.

## Cobertura

- Origen: `https://tile.nightcitynavigator.com/nightcity/{z}/{x}/{y}.png`.
- Esquema XYZ, tiles de 256 × 256 px.
- Límites del proveedor: latitud y longitud de −0,1 a +0,1 grados. El margen de −0,15 a +0,15 usado como `maxBounds` en `cyber-manager` permite desplazar el mapa fuera de esta cobertura; no amplía los datos del mapa.
- Zoom 11–19: todos los niveles del proveedor, 114.056 tiles. Los zooms 18–19 amplían el detalle de la configuración original de `cyber-manager` (11–17).

| Zoom | Tiles |
| --- | ---: |
| 11 | 4 |
| 12 | 16 |
| 13 | 36 |
| 14 | 100 |
| 15 | 400 |
| 16 | 1.444 |
| 17 | 5.476 |
| 18 | 21.316 |
| 19 | 85.264 |
| Total | 114.056 |

La configuración pública de `L.OSM.NCNCarto`, consultada el 27 de septiembre de 2026, está en [el JavaScript del proveedor](https://nightcitynavigator.com/assets/application-339705ea40f73a4ec073f156879c60dcfb70ab3b7d9ea9c4d94b82b1aa1ee6c0.js).

## Archivos y descarga

Los PNG originales se guardan sin modificar en `public/maps/night-city-2077/reading/{z}/{x}/{y}.png`. `public/maps/night-city-2077/manifest.json` registra la cobertura, procedencia, atribución, errores, tamaño y SHA-256 de cada tile. `complete: true` significa que todos los tiles esperados han pasado la validación.

Al compilar para publicación, `scripts/pack-night-city-map.mjs` verifica los SHA-256 y elimina únicamente las imágenes repetidas de `dist/client`; conserva intactos los originales locales. El visor compilado incorpora un índice que asigna todas las coordenadas de zoom 11–19 a sus imágenes originales: 114.056 coordenadas utilizan 10.899 PNG distintos. Así se publican todos los niveles dentro del límite de archivos del alojamiento, sin alterar píxeles, coordenadas, temas ni marcadores. El visor de desarrollo sigue usando las rutas XYZ locales.

```sh
node scripts/download-night-city-tiles.mjs --plan
node scripts/download-night-city-tiles.mjs
node scripts/download-night-city-tiles.mjs --workers=64
node scripts/download-night-city-tiles.mjs --verify
```

La descarga usa 12 conexiones por defecto; `--workers=N` permite entre 1 y 64. Deja 25 ms entre descargas de cada conexión, reintenta fallos transitorios y respeta `Retry-After` con una pausa compartida ante respuestas 429 o 503. Valida la firma PNG, dimensiones, CRC de todos los chunks y el final de archivo. Escribe cada tile de forma atómica y reutiliza los archivos válidos al reanudar. Una descarga incompleta termina con un código de error y no declara completo el inventario.

## Dos aspectos con la misma geometría

El mapa se abre desde **Mapa de Night City**, la cuarta sección de la navegación de la mesa. Reutiliza el visor `/maps/night-city-2077/preview.html` en modo integrado (`?embed=1`), sin otra cabecera ni controles de tema duplicados. Solo solicita tiles locales; no recurre al proveedor si falta un archivo.

La fecha visible es **circa 2080** en la navegación, el editor de marcadores y el visor independiente. El origen cartográfico y las rutas de assets conservan `2077`, la edición original del juego.

El visor muestra un loader con progreso mientras llegan y se decodifican las imágenes de la vista actual, también al desplazar o cambiar el zoom. Las imágenes retiradas de la vista ya no cuentan como pendientes. Si falla una imagen, termina su carga y se muestra el aviso de archivo ausente, sin dejar el loader activo. La mesa muestra además el loader mientras abre el documento del visor.

La paleta elegida por el usuario para la variante cyberpunk es oscura, con cian y naranja de Magnus Laser.

- **Flesh / lectura:** PNG originales, sin filtro.
- **Chrome / cyberpunk:** la misma capa local con una paleta oscura aplicada al renderizar, mediante `invert(1) hue-rotate(180deg) saturate(1.5) brightness(1.18) contrast(1.1)`. El contraste lleva el beige original por debajo del fondo de tinta `#11161b`; la composición `lighten` lo iguala a ese fondo, conservando las calles y zonas de color. La paleta se ajusta en `preview.css`.

El filtro afecta únicamente a la capa del mapa, no a los controles, marcadores o textos de interfaz. Cambiar el aspecto conserva zoom y posición. Calles, nombres, límites y coordenadas son idénticos; no se usa generación de imágenes para reinterpretar datos geográficos ni se duplica el archivo de cada tile.

La vista permite arrastrar, rueda, pellizco, botones de zoom y teclado. La sección conserva el visor al cambiar de pestaña, y sincroniza Chrome/Flesh y ES/EN con la mesa sin recargarlo ni reiniciar zoom o posición. La comunicación entre mesa y visor comprueba origen y ventana emisora; la sesión sigue abierta con su registro y notas.

El enlace directo permanece disponible para revisar el mapa por separado, con sus propios controles. `app/night-city-map.tsx` integra el visor, y `app/edgerunners.css` mantiene los estilos y la geometría compartida de la navegación en ambos temas.

## Marcadores vinculados al registro

Arrastrar una entrada del registro sobre el mapa guarda sus coordenadas y crea un marcador con su título. Si el mapa aún no está abierto, pasar el arrastre por su sección de navegación lo abre. Arrastrar la misma entrada de nuevo, o el propio marcador, cambia su posición sin duplicarlo.

El botón de mapa en cada entrada permite colocarla con un toque sobre el mapa; también admite flechas para desplazar la vista, Enter para colocar en el centro y Escape o Cancelar para salir sin cambios. Mover la vista arrastrando o pellizcando no coloca marcadores accidentalmente.

Pulsar un marcador abre **Editar marcador**: título y contenido pertenecen a la entrada original, y Guardar actualiza el registro, el marcador y cualquier resultado abierto que muestre esa entrada. Quitar marcador borra solo la ubicación; eliminar la entrada desde el registro elimina también su marcador. Regenerar conserva ubicación, fecha, orden y estado de fijado.

El editor usa la cabecera naranja de Magnus Laser, una banda cian que identifica la vinculación, coordenadas y las acciones angulares compartidas de la mesa. Los colores se aplican a superficies y controles; no se usan franjas ni bordes izquierdos decorativos. Chrome y Flesh conservan la misma geometría, tipografía y controles.

La ubicación opcional `Entry.map` se guarda junto al resto de la sesión en el navegador, sin cambiar las claves ni versiones existentes. Las sesiones anteriores siguen siendo válidas. Las entradas con marcadores se conservan junto a las fijadas cuando se supera el límite de 200 resultados recientes, para no perder puntos del mapa.

El visor recibe únicamente los identificadores, títulos y ubicaciones de la sesión activa; devuelve acciones con ese identificador de sesión. Ambos lados comprueban origen y ventana emisora. Se rechazan arrastres de otras sesiones, entradas eliminadas y coordenadas fuera de la cobertura. Los títulos se insertan como texto, sin interpretar HTML.

Las pruebas de `tests/map-viewer.test.mjs` ejercitan los eventos reales del visor con elementos simulados, sin navegador ni red; `tests/engine.test.mjs` comprueba persistencia, edición compartida, movimiento, eliminación de ubicación, retención y aislamiento entre sesiones.

## Créditos

Game data © CD PROJEKT RED. Map © Night City Navigator y sus colaboradores. Los datos originales del proyecto están bajo ODbL: [atribución y licencia del proveedor](https://nightcitynavigator.com/copyright). Se conserva esta atribución en el visor y en el inventario. No se ha publicado ni modificado el proyecto `cyber-manager`.
