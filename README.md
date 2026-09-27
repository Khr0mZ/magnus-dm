# Magnus Laser — Mesa del DM

Versión reducida de `cyber-manager`: una única página en español con las herramientas del DM y los generadores aleatorios. Conserva el logotipo y la estética cyberpunk de Magnus Laser.

## Uso local

Requiere Node.js 22.13 o superior.

```sh
npm ci
npm run dev
```

Abre la dirección que indique el servidor. La página tiene tres secciones: Mesa del DM, Generadores y Tablas de referencia. Las herramientas de sesión se cambian dentro de la misma página.

## Contenido

- Dados con fórmulas y modificadores; críticos de RED opcionales para 1d10.
- Oráculo cerrado con cinco probabilidades y preguntas abiertas.
- Generadores originales en español, encuentros por zona y hora, y seis generadores de contenido: contactos, encargos, bandas, edificios, recompensas y objetos.
- Referencias originales de combate, heridas, equipo, habilidades, ciberware, netrunning y más, con búsqueda.
- Relojes de reserva de d6, escalada y Suerte del diablo.
- Constructor de misión editable y regeneración por campo.
- Registro de PNJ y fichas, escenas y estructura narrativa.
- Pruebas de investigación, desafíos sociales y puntos de mejora.
- Tablas personales con resultados ponderados.
- Favoritos, historial, resultados fijados, notas y modo lectura.

## Guardado

Todo el estado de la sesión se guarda automáticamente en `localStorage`, con la clave `magnus-dm.session.v1`. No hay cuentas de la aplicación, base de datos, importación ni exportación. Los datos pertenecen al navegador y al origen donde abres la web: la vista local y el enlace publicado tienen sesiones independientes. Borrar los datos del sitio elimina la sesión.

Los últimos 200 resultados se conservan, además de todos los fijados. La aplicación detecta almacenamiento inaccesible, agotado o corrupto y muestra un aviso. Los generadores funcionan localmente, sin API de IA ni claves. Las seis fichas completas son generadores procedurales; sus estadísticas y detalles editables sirven como punto de partida para el DM.

## Comprobaciones

```sh
npm test
npm run lint
npm run build
npm run test:render
```

Las pruebas verifican generadores y traducciones, referencias, fórmulas, límites del oráculo, relojes, probabilidades ponderadas, conservación del estado y HTML de producción. No sustituyen una prueba manual completa de la interfaz en navegador.

## Estructura

- `app/workbench.tsx`: página, generadores, referencias, dados, oráculo y registro.
- `app/dm-tools.tsx`: herramientas de dirección.
- `app/use-session.ts`: carga y guardado en el navegador.
- `lib/engine.ts` y `lib/session.ts`: reglas y estado validado.
- `lib/data/`, `lib/catalog.ts` y `lib/reference.ts`: datos adaptados del proyecto original.
- `app/globals.css`: diseño responsive y modo lectura.

Se han excluido mapas, simuladores 2D/3D, multijugador, Tauri, GraphQL, gestión de personajes jugadores y servicios de generación por IA. El despliegue usa la estructura de Sites/Vinext y no declara almacenamiento remoto.

## Recursos

Las tablas en español, los colores y los logotipos proceden de `../cyber-manager/client/Magnus-Laser`. No se ha modificado el proyecto original.

`public/og.png` es la tarjeta de presentación creada con la herramienta integrada ImageGen. El prompt utilizado se conserva en `docs/social-card-prompt.txt`.