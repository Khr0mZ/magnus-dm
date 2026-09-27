import type { GMTableCategory, GMTableDef } from './reference';

// Summaries checked against the user-provided CEMK Rule Book.
// Page references use the book's printed numbering, not the PDF viewer's index.
// Type-only imports keep this catalog independent from reference/i18n at runtime.
type Bilingual = { es: string; en: string };
type Cell = Bilingual | string | number;
type RuleFile = {
  key: string; title: Bilingual; description: Bilingual; pages: string; sheet?: string;
  headers?: Bilingual[]; rows: Cell[][];
};
const b = (es: string, en: string): Bilingual => ({ es, en });
const ruleHeaders = [b('Regla', 'Rule'), b('Resolución', 'Resolution')];
const hackHeaders = [b('Quickhack', 'Quickhack'), b('DV', 'DV'), b('Efecto y límites', 'Effect and limits')];
const hackDescription = b(
  'Mission Kit: 1 acción NET y un único intento por objetivo y turno, incluso si falla. Primero supera todos sus Passwalls. Tira Interfaz + 1d10 y supera la DV. En RED, aplica también los requisitos de rango de la carpeta RED + CEMK.',
  'Mission Kit: 1 NET Action and only one attempt per target per turn, even on failure. Breach all its Passwalls first. Roll Interface + 1d10 and beat the DV. In RED, also apply the rank requirements in the RED + CEMK folder.',
);
const monthlyDescription = b(
  'RED + CEMK: evalúa al principio de cada mes. Los efectos son acumulativos: tira por cada condición aplicable. Las ganancias nunca superan la Humanidad máxima.',
  'RED + CEMK: assess at the start of each month. Effects are cumulative: roll for each qualifying condition. Gains never exceed Maximum Humanity.',
);

const netrunning: RuleFile[] = [
  {
    key: 'cemkTurn', title: b('Turno NET · Mission Kit', 'NET turn · Mission Kit'), pages: '12, 15–17', sheet: 'Quickhacking Reference',
    description: b('Reglas rápidas de quickhacking del Mission Kit. La adaptación al sistema completo está en RED + CEMK.', 'Mission Kit quickhacking rules. The full-system adaptation is in RED + CEMK.'),
    rows: [
      [b('Objetivo válido', 'Valid target'), b('Necesita un neuroport. Sin neuroport, no puedes realizar quickhacks contra él.', 'The target needs a Neuroport. Without one, you cannot Quickhack them.')],
      [b('Economía del turno', 'Turn economy'), b('Movimiento normal + 1 acción física O hasta 3 acciones NET en el Mission Kit. No combines acciones físicas y NET en el mismo turno.', 'Normal Move Action + either 1 Meat Action OR up to 3 NET Actions in the Mission Kit. Do not combine Meat and NET Actions in one turn.')],
      [b('Tirada de Interfaz', 'Interface Check'), b('Rango de Interfaz + 1d10; no sumas ningún STAT. Se aplican las reglas normales de críticos, Suerte, habilidad complementaria y tiempo extra; también penalizadores por heridas o agarres.', 'Interface rank + 1d10; add no STAT. Normal critical, LUCK, Complementary Skill and Taking Extra Time rules apply, as do wound and grappling penalties.')],
      [b('Secuencia', 'Sequence'), b('Jack In → Breach de cada Passwall → Quickhack. Jack Out permite salir de forma segura. Cada paso consume 1 acción NET.', 'Jack In → Breach each Passwall → Quickhack. Jack Out disconnects safely. Each step costs 1 NET Action.')],
      [b('Límite de intentos', 'Attempt limit'), b('Solo 1 intento de quickhack por objetivo y turno, aunque falle. Con acciones NET restantes puedes actuar contra otros objetivos.', 'Only 1 Quickhack attempt per target per turn, even if it fails. Remaining NET Actions can target other people.')],
      [b('Alerta', 'Awareness'), b('Un quickhack exitoso alerta inmediatamente al objetivo, salvo Lure.', 'A successful Quickhack immediately alerts the target, except Lure.')],
      [b('Quickhacks disponibles', 'Available Quickhacks'), b('En las reglas rápidas, todos los netrunners pueden usar los 11 quickhacks. La progresión por rango pertenece a la adaptación RED.', 'In the quickstart rules, every Netrunner can use all 11 Quickhacks. Rank progression belongs to the RED adaptation.')],
      [b('Daño crítico', 'Critical damage'), b('Los dados de daño de quickhacks no provocan lesiones críticas al sacar dos 6. Sonic Shock sí impone expresamente el efecto de oído dañado.', 'Quickhack damage dice do not trigger Critical Injuries by rolling two 6s. Sonic Shock explicitly imposes the Damaged Ear effect.')],
    ],
  },
  {
    key: 'cemkConnection', title: b('Jack In / expulsión', 'Jack In / ejection'), pages: '16',
    description: b('Mission Kit · conexión inalámbrica a un neuroport.', 'Mission Kit · wireless connection to a Neuroport.'),
    rows: [
      [b('Alcance y coste', 'Range and cost'), b('1 acción NET. Objetivo visible a 50 m o menos (25 casillas). En RED el alcance depende del cyberdeck.', '1 NET Action. Visible target within 50 m/yd (25 squares). In RED, range depends on the Cyberdeck.')],
      [b('Entrar sin ser detectado', 'Undetected entry'), b('Interfaz + 1d10 contra WILL + 1d10 del objetivo. Si fallas, entras igualmente, pero el objetivo lo sabe. Un netrunner siempre detecta la intrusión: omite esta tirada.', 'Interface + 1d10 vs target WILL + 1d10. Failure still connects you, but alerts the target. A Netrunner always notices the intrusion: skip this roll.')],
      [b('Expulsar al intruso', 'Eject the intruder'), b('Si es consciente del ataque, el objetivo puede gastar una acción (ROF 1) en su turno: WILL + Concentración + 1d10 contra Interfaz + 1d10 del intruso.', 'An aware target may spend an Action (ROF 1) on their turn: WILL + Concentration + 1d10 vs the intruder’s Interface + 1d10.')],
      [b('Después de la expulsión', 'After ejection'), b('El netrunner expulsado no puede intentar conectar al mismo neuroport durante 60 minutos.', 'An ejected Netrunner cannot attempt to reconnect to that Neuroport for 60 minutes.')],
      [b('Duración de la conexión', 'Connection duration'), b('Hasta que te expulsen, alguno salga del alcance, uses Jack Out o el objetivo muera.', 'Until you are forced out, either participant moves out of range, you Jack Out, or the target dies.')],
      [b('Conexiones simultáneas', 'Concurrent connections'), b('Puedes mantener varios neuroports conectados dentro del alcance. Cada Jack In consume su propia acción NET.', 'You may remain connected to multiple Neuroports within range. Each Jack In costs its own NET Action.')],
      ['Jack Out', b('1 acción NET para desconectarte de forma segura de un objetivo.', '1 NET Action to disconnect safely from one target.')],
    ],
  },
  {
    key: 'cemkBreach', title: b('Breach / Self-ICE / Passwalls', 'Breach / Self-ICE / Passwalls'), pages: '16, 26',
    description: b('Cada Self-ICE añade un Passwall y aumenta en 2 la DV de TODOS los Passwalls. Debes superar todos antes de usar quickhacks. El firewall básico de RED es una defensa distinta.', 'Each Self-ICE adds a Passwall and raises the DV of ALL Passwalls by 2. Breach every wall before Quickhacking. RED’s basic firewall is a separate defense.'),
    headers: [b('Self-ICE', 'Self-ICE'), b('Passwalls', 'Passwalls'), b('DV de cada muro', 'Each wall’s DV'), b('Acciones NET mínimas', 'Minimum NET Actions')],
    rows: [[0, 0, '—', 0], [1, 1, 6, 1], [2, 2, 8, 2], [3, 3, 10, 3], ['n ≥ 1', 'n', '4 + 2n', b('n, si cada tirada tiene éxito', 'n, if every roll succeeds')]],
  },
  {
    key: 'cemkQuickhacks6', title: b('Quickhacks · DV 6', 'Quickhacks · DV 6'), pages: '13, 16', description: hackDescription, headers: hackHeaders,
    rows: [
      [b('Impedir movimiento / Impair Movement', 'Impair Movement'), 6, b('MOVE −1 durante 60 segundos (20 asaltos). Con MOVE 0 no puede realizar una acción de movimiento.', 'MOVE −1 for 60 seconds (20 rounds). At MOVE 0, the target cannot take a Move Action.')],
      [b('Choque sónico / Sonic Shock', 'Sonic Shock'), 6, b('Oído dañado durante 60 segundos (20 asaltos), sin daño adicional: −2 a Percepción auditiva; si recorre más de 4 m a pie en un turno, no puede usar movimiento en el siguiente.', 'Damaged Ear for 60 seconds (20 rounds), without Bonus Damage: −2 to hearing-related Perception; moving more than 4 m/yd on foot in a turn prevents a Move Action on the next turn.')],
    ],
  },
  {
    key: 'cemkQuickhacks8', title: b('Quickhacks · DV 8', 'Quickhacks · DV 8'), pages: '16', description: hackDescription, headers: hackHeaders,
    rows: [
      [b('Sobrecalentamiento / Overheat', 'Overheat'), 8, b('Prende fuego al objetivo: 4 de daño directo a PV al final de cada uno de sus turnos hasta apagarlo. Ignora la armadura y no la reduce. Apagarlo requiere una acción (ROF 1), solo en el turno del objetivo.', 'Sets the target on fire: 4 direct HP damage at the end of each of their turns until extinguished. Bypasses armor without ablation. Extinguishing takes an Action (ROF 1), only on the target’s turn.')],
      [b('Cortocircuito / Short Circuit', 'Short Circuit'), 8, b('El DJ elige 3 piezas de ciberware que dejan de funcionar durante 60 segundos (20 asaltos). Excluye Cyberarm, Cyberleg, Cybereye, Cyberaudio Suite, Neuroport y Neuroport Cyberdeck Expansion. Sus opciones instaladas sí pueden ser objetivos.', 'The GM chooses 3 pieces of cyberware to disable for 60 seconds (20 rounds). Excludes Cyberarm, Cyberleg, Cybereye, Cyberaudio Suite, Neuroport and Neuroport Cyberdeck Expansion. Options installed in those pieces can be targeted.')],
    ],
  },
  {
    key: 'cemkQuickhacks10', title: b('Quickhacks · DV 10', 'Quickhacks · DV 10'), pages: '16–17', description: hackDescription, headers: hackHeaders,
    rows: [
      [b('Fallo de ciberware / Cyberware Malfunction', 'Cyberware Malfunction'), 10, b('El jugador del netrunner elige 1 pieza, excepto Neuroport o Neuroport Cyberdeck Port: queda inoperable 60 segundos (20 asaltos), junto con sus opciones. Las extremidades cibernéticas actúan como con Brazo roto o Pierna rota.', 'The Netrunner’s player chooses 1 piece, except a Neuroport or Neuroport Cyberdeck Port: it and its options stop working for 60 seconds (20 rounds). Disabled cyberlimbs act as with a Broken Arm or Broken Leg.')],
      [b('Señuelo / Lure', 'Lure'), 10, b('Solo contra un objetivo que ignore la intrusión. Al inicio de su próximo turno, el netrunner controla su acción de movimiento hacia un sonido fantasma. No puede llevarlo a un peligro físico evidente. No alerta al objetivo.', 'Only against a target unaware of the intrusion. At the start of their next turn, the Netrunner controls their Move Action toward a phantom sound. Cannot lead into obvious physical danger. Does not alert the target.')],
      [b('Ralentizar / Slow', 'Slow'), 10, b('MOVE −1d6 durante 60 segundos (20 asaltos). Con MOVE 0 no puede realizar una acción de movimiento.', 'MOVE −1d6 for 60 seconds (20 rounds). At MOVE 0, the target cannot take a Move Action.')],
      [b('Quemadura sináptica / Synapse Burnout', 'Synapse Burnout'), 10, b('3d6 de daño directo a PV. Ignora la armadura y no la reduce.', '3d6 direct HP damage. Bypasses armor without ablation.')],
    ],
  },
  {
    key: 'cemkQuickhacks12', title: b('Quickhacks · DV 12', 'Quickhacks · DV 12'), pages: '17', description: hackDescription, headers: hackHeaders,
    rows: [
      [b('Marioneta / Puppet', 'Puppet'), 12, b('Controlas la acción y el movimiento del próximo turno del objetivo, dentro de sus capacidades físicas. Puede dañarse o atacar a sus aliados. Usa los STAT y habilidades del objetivo, no los del netrunner.', 'Control the target’s Action and Move Action on their next turn, within their physical capabilities. They can harm themselves or attack allies. Use the target’s STATS and Skills, not the Netrunner’s.')],
      [b('Expulsión de chip / Shard Ejection', 'Shard Ejection'), 12, b('Desinstala y expulsa 1 chipware elegido a una casilla adyacente. No funciona si la ranura tiene una tapa o incluso cinta adhesiva.', 'Uninstalls and ejects 1 chosen piece of chipware into an adjacent square. Fails if the slot is covered, even with tape.')],
      [b('Reinicio / System Reset', 'System Reset'), 12, b('El objetivo cae al suelo e inconsciente durante 60 segundos (20 asaltos), o hasta que reciba daño.', 'The target falls Prone and Unconscious for 60 seconds (20 rounds), or until taking damage.')],
    ],
  },
];

const redNetrunning: RuleFile[] = [
  {
    key: 'cemkInterface', title: b('Interfaz · progresión RED', 'Interface · RED progression'), pages: '25',
    description: b('Adaptación del Mission Kit al sistema completo de Cyberpunk RED. Sustituye el acceso universal a quickhacks de las reglas rápidas; conserva las acciones NET por rango de RED.', 'Mission Kit adaptation for the full Cyberpunk RED system. Replaces the quickstart’s universal access to Quickhacks; retain RED’s NET Actions per rank.'),
    headers: [b('Rango de Interfaz', 'Interface rank'), b('Desbloqueo acumulativo', 'Cumulative unlock')],
    rows: [
      [1, b('Todos los quickhacks simples (DV 6).', 'All Simple Quickhacks (DV 6).')],
      [2, b('Todos los quickhacks estándar (DV 8).', 'All Standard Quickhacks (DV 8).')],
      [3, b('Todos los quickhacks difíciles (DV 10). Supera automáticamente el firewall básico del neuroport.', 'All Difficult Quickhacks (DV 10). Automatically bypass a Neuroport’s basic firewall.')],
      ['4+', b('Todos los quickhacks avanzados (DV 12).', 'All Advanced Quickhacks (DV 12).')],
      ['Scanner', b('Pasa de acción física a acción NET.', 'Changes from a Meat Action to a NET Action.')],
    ],
  },
  {
    key: 'cemkRange', title: b('Alcance · RED + CEMK', 'Range · RED + CEMK'), pages: '26',
    description: b('Adaptación RED: siempre necesitas línea de visión para quickhacking inalámbrico.', 'RED adaptation: wireless Quickhacking always requires line of sight.'),
    headers: [b('Conexión', 'Connection'), b('Alcance', 'Range'), b('Casillas', 'Squares')],
    rows: [
      [b('Cyberdeck externo', 'External Cyberdeck'), '6 m', 3],
      [b('Externo con la opción de hardware adecuada', 'External deck with the appropriate hardware option'), '8 m', 4],
      [b('Cyberdeck en Neuroport Cyberdeck Port', 'Cyberdeck in a Neuroport Cyberdeck Port'), '50 m', 25],
    ],
  },
  {
    key: 'cemkFirewall', title: b('Firewall / salida insegura', 'Firewall / unsafe Jack Out'), pages: '26',
    description: b('RED + CEMK · defensas adicionales al proceso de Jack In y Breach.', 'RED + CEMK · additional defenses for the Jack In and Breach process.'),
    rows: [
      [b('Interfaz 1–2', 'Interface 1–2'), b('Al usar Jack In, supera primero una tirada de Interfaz DV 6 para atravesar el firewall básico. Fallar no alerta al defensor.', 'When using Jack In, first beat a DV 6 Interface Check to bypass the basic firewall. Failure does not alert the defender.')],
      [b('Interfaz 3+', 'Interface 3+'), b('Superas automáticamente el firewall básico, sin tirada.', 'Automatically bypass the basic firewall without a roll.')],
      [b('Después del firewall', 'After the firewall'), b('Resuelve la tirada enfrentada Interfaz contra WILL para saber si el objetivo detecta la intrusión; un netrunner siempre la detecta.', 'Resolve the opposed Interface vs WILL check for detection; a Netrunner always detects the intrusion.')],
      [b('No es un Passwall', 'Not a Passwall'), b('El firewall básico no ocupa una planta de la arquitectura y no sustituye a los Passwalls de Self-ICE.', 'The basic firewall occupies no architecture floor and does not replace Self-ICE Passwalls.')],
      [b('Salida insegura', 'Unsafe Jack Out'), b('Salir por cualquier causa distinta de la acción NET Jack Out cuenta como salida insegura y aplica las consecuencias normales de RED. No puedes reconectar a ese neuroport durante 60 minutos.', 'Leaving for any reason other than the Jack Out NET Action is an Unsafe Jack Out with normal RED consequences. You cannot reconnect to that Neuroport for 60 minutes.')],
    ],
  },
  {
    key: 'cemkArchitecture', title: b('Arquitectura del neuroport', 'Neuroport architecture'), pages: '26–27',
    description: b('RED + CEMK · el neuroport funciona como una arquitectura NET.', 'RED + CEMK · the Neuroport acts as a NET Architecture.'),
    rows: [
      [b('Estructura mínima', 'Minimum structure'), b('Sin Self-ICE ni Black ICE: 1 planta con un nodo de control DV 10 para el holoteléfono.', 'Without Self-ICE or Black ICE: 1 floor containing a DV 10 Control Node for the holophone.')],
      [b('Plantas adicionales', 'Additional floors'), b('Una planta por Passwall instalado y por Black ICE conectado, además del nodo del holoteléfono. El usuario decide su orden.', 'One floor per installed Passwall and connected Black ICE, plus the holophone node. The user chooses their order.')],
      ['Black ICE', b('No se instala directamente en el neuroport. Se toma del cyberdeck conectado; la arquitectura se expande para alojarlo.', 'Cannot be installed directly in the Neuroport. Borrow it from the connected Cyberdeck; the architecture expands to accommodate it.')],
      [b('Defensa del propietario', 'Owner’s defense'), b('Un netrunner está siempre conectado a su propio neuroport, puede combatir al intruso y no puede ser expulsado de él.', 'A Netrunner is always Jacked In to their own Neuroport, may battle the intruder, and cannot be Jacked Out of it.')],
      ['Virus', b('Al llegar al fondo, puedes dejar un Virus siguiendo las reglas de RED (manual básico, p. 201).', 'At the bottom, you may leave a Virus using RED’s normal rules (core book, p. 201).')],
      ['Breach', b('Es el nuevo nombre de la acción NET Backdoor.', 'The new name for the Backdoor NET Action.')],
    ],
  },
  {
    key: 'cemkDirect', title: b('Conexión directa', 'Direct connection'), pages: '27',
    description: b('RED + CEMK · Jack In mediante Personal Link / Interface Plug.', 'RED + CEMK · Jack In through a Personal Link / Interface Plug.'),
    rows: [
      [b('Condiciones', 'Requirements'), b('Requiere proximidad. El objetivo debe consentir, estar inconsciente o completamente inmovilizado e incapaz de resistirse físicamente.', 'Requires proximity. The target must consent, be unconscious, or be fully restrained and unable to physically resist.')],
      [b('Objetivo despierto', 'Awake target'), b('Sabe que está siendo hackeado y puede intentar expulsarte de la forma habitual.', 'Knows they are being hacked and may try to eject you normally.')],
      [b('Ventaja de acciones', 'Action benefit'), b('+1 acción NET por turno mientras estés conectado directamente.', '+1 NET Action per turn while directly connected.')],
      [b('Defensas', 'Defenses'), b('Puedes saltarte todos los Passwalls, pero no el Black ICE.', 'You may bypass all Passwalls, but not Black ICE.')],
      [b('Distancia y ruptura', 'Distance and breakage'), b('Una separación superior a 2 m (1 casilla), arrancar el cable o cortarlo fuerza la desconexión. Aplica la regla de salida insegura.', 'Separation beyond 2 m/yd (1 square), pulling the plug, or severing the link forces a Jack Out. Apply the Unsafe Jack Out rule.')],
    ],
  },
];

const otherRules: RuleFile[] = [
  {
    key: 'cemkCriticalBody', title: b('Críticos al cuerpo · kit', 'Body Critical Injuries · kit'), pages: '12–14',
    description: b('Mission Kit: dos o más 6 en daño cuerpo a cuerpo, a distancia, pelea o arrojadizas causan 5 de daño adicional directo y una lesión (1d6). Quickhacks no cuentan. Power aumenta ese daño adicional en 5. Estas tablas de 1d6 son las del kit, no las de 2d6 de RED.', 'Mission Kit: two or more 6s on Melee, Ranged, Brawling or Thrown damage cause 5 direct Bonus Damage and an injury (1d6). Quickhacks do not count. Power adds 5 to that Bonus Damage. These are the kit’s 1d6 tables, not RED’s 2d6 tables.'),
    headers: [b('1d6', '1d6'), b('Lesión', 'Injury'), b('Efecto', 'Effect'), b('Arreglo rápido', 'Quick Fix'), b('Tratamiento', 'Treatment')],
    rows: [
      [1, b('Costillas rotas', 'Broken Ribs'), b('Al final de un turno en el que recorras más de 4 m a pie, vuelve a sufrir el daño adicional de la lesión directamente a PV.', 'At the end of a turn in which you move more than 4 m/yd on foot, suffer the injury’s Bonus Damage directly to HP again.'), 'Paramedic DV 13', 'Paramedic DV 15 / Surgery DV 13'],
      [2, b('Brazo roto', 'Broken Arm'), b('No puedes usar ese brazo. Sueltas inmediatamente lo que sujetes con esa mano.', 'Cannot use that arm. Immediately drop items held in that hand.'), 'Paramedic DV 13', 'Paramedic DV 15 / Surgery DV 13'],
      [3, b('Objeto extraño', 'Foreign Object'), b('Al final de un turno en el que recorras más de 4 m a pie, vuelve a sufrir el daño adicional de la lesión directamente a PV.', 'At the end of a turn in which you move more than 4 m/yd on foot, suffer the injury’s Bonus Damage directly to HP again.'), 'First Aid / Paramedic DV 13', b('El arreglo rápido elimina el efecto permanentemente.', 'Quick Fix removes the effect permanently.')],
      [4, b('Pierna rota', 'Broken Leg'), 'MOVE −4 (min. 1)', 'Paramedic DV 13', 'Paramedic DV 15 / Surgery DV 13'],
      [5, b('Músculo desgarrado', 'Torn Muscle'), b('−2 a ataques cuerpo a cuerpo.', '−2 to Melee Attacks.'), 'First Aid / Paramedic DV 13', b('El arreglo rápido elimina el efecto permanentemente.', 'Quick Fix removes the effect permanently.')],
      [6, b('Dedos aplastados', 'Crushed Fingers'), b('−4 a acciones con esa mano.', '−4 to actions involving that hand.'), 'Paramedic DV 13', 'Surgery DV 15'],
    ],
  },
  {
    key: 'cemkCriticalHead', title: b('Críticos a la cabeza · kit', 'Head Critical Injuries · kit'), pages: '12–14',
    description: b('Mission Kit: usa esta tabla de 1d6 si el ataque crítico era un disparo apuntado a la cabeza. El daño adicional normal es 5; Power añade otros 5. Sonic Shock aplica solo el efecto de Oído dañado durante su duración.', 'Mission Kit: use this 1d6 table when the critical attack was an Aimed Shot to the head. Normal Bonus Damage is 5; Power adds another 5. Sonic Shock applies only the Damaged Ear effect for its duration.'),
    headers: [b('1d6', '1d6'), b('Lesión', 'Injury'), b('Efecto', 'Effect'), b('Arreglo rápido', 'Quick Fix'), b('Tratamiento', 'Treatment')],
    rows: [
      [1, b('Daño cerebral', 'Brain Injury'), b('−2 a todas las acciones; +1 al penalizador de salvación de muerte.', '−2 to all Actions; Death Save Penalty +1.'), '—', 'Surgery DV 17'],
      [2, b('Ojo dañado', 'Damaged Eye'), b('−2 a ataques a distancia y Percepción visual.', '−2 to Ranged Attacks and sight-related Perception.'), 'Paramedic DV 15', 'Surgery DV 13'],
      [3, b('Conmoción', 'Concussion'), b('−2 a todas las acciones.', '−2 to all Actions.'), 'First Aid / Paramedic DV 13', b('El arreglo rápido elimina el efecto permanentemente.', 'Quick Fix removes the effect permanently.')],
      [4, b('Oído dañado', 'Damaged Ear'), b('Tras recorrer más de 4 m a pie en un turno, no puedes usar movimiento en el siguiente. −2 a Percepción auditiva.', 'After moving more than 4 m/yd on foot in a turn, you cannot take a Move Action next turn. −2 to hearing-related Perception.'), 'Paramedic DV 13', 'Surgery DV 13'],
      [5, b('Tráquea aplastada', 'Crushed Windpipe'), b('No puedes hablar; +1 al penalizador de salvación de muerte.', 'Cannot speak; Death Save Penalty +1.'), '—', 'Surgery DV 15'],
      [6, b('Cráneo fracturado', 'Cracked Skull'), b('Los disparos apuntados a tu cabeza multiplican por 3 el daño tras restar SP, en lugar de por 2. +1 al penalizador de salvación de muerte.', 'Aimed Shots to your head multiply damage after SP by 3 instead of 2. Death Save Penalty +1.'), 'Paramedic DV 15', 'Paramedic / Surgery DV 15'],
    ],
  },
  {
    key: 'cemkHealing', title: b('Heridas / curación · kit', 'Wounds / healing · kit'), pages: '14',
    description: b('Mission Kit · cada estado de heridas sustituye los efectos del anterior. First Aid = Primeros auxilios; Paramedic = Paramédico; Surgery = Cirugía.', 'Mission Kit · each wound state replaces the previous state’s effects.'),
    rows: [
      [b('Herido leve', 'Lightly Wounded'), b('PV por debajo del máximo, pero por encima de la mitad: sin penalización. Estabilización DV 10.', 'HP below maximum but above half: no penalty. Stabilization DV 10.')],
      [b('Herido grave', 'Seriously Wounded'), b('PV a la mitad o menos, pero por encima de 0: −2 a todas las tiradas. Estabilización DV 13.', 'HP at half or less, but above 0: −2 to all Checks. Stabilization DV 13.')],
      [b('Herido mortal', 'Mortally Wounded'), b('0 PV: −4 a todas las tiradas y MOVE −6 (mínimo 1). Daño adicional no reduce más los PV, pero provoca automáticamente una lesión crítica. Estabilización DV 15.', '0 HP: −4 to all Checks and MOVE −6 (minimum 1). Further damage does not lower HP, but automatically causes a Critical Injury. Stabilization DV 15.')],
      [b('Salvación de muerte', 'Death Save'), b('Al inicio de cada turno con heridas mortales: 1d10 + penalizador, resultado inferior a BODY para vivir. Un 10 natural siempre falla. Cada tirada añade +1 a las siguientes, acumulable con lesiones. Un solo fallo mata.', 'At the start of each Mortally Wounded turn: 1d10 + penalty must be below BODY to survive. A natural 10 always fails. Each roll adds +1 to later saves, stacking with injury penalties. A single failure kills.')],
      [b('Estabilizar', 'Stabilize'), b('1 acción (ROF 1): TECH + Primeros auxilios o Paramédico + 1d10 contra la DV del estado. Puedes estabilizarte a ti mismo. Elimina las salvaciones de muerte y su penalizador acumulado por tiradas, pero conserva el de lesiones sin curar.', '1 Action (ROF 1): TECH + First Aid or Paramedic + 1d10 vs the wound-state DV. You may stabilize yourself. Ends Death Saves and removes penalties accumulated from rolling them, but retains penalties from untreated injuries.')],
      [b('Curación natural', 'Natural healing'), b('Una vez estabilizado, recuperas BODY PV por cada día completo de descanso.', 'Once stabilized, recover BODY HP per full day of rest.')],
      [b('Arreglo rápido / Quick Fix', 'Quick Fix'), b('Intentarlo tarda 60 segundos (20 asaltos); puedes hacerlo sobre ti mismo. Suprime el efecto hasta el amanecer siguiente, salvo que la tabla indique curación permanente.', 'An attempt takes 60 seconds (20 rounds); may be performed on yourself. Suppresses the effect until next sunrise, unless the table specifies permanent removal.')],
      [b('Tratamiento / Treatment', 'Treatment'), b('Intentarlo tarda 4 horas; elimina el efecto permanentemente. No puedes tratarte a ti mismo. Cirugía requiere un Medtech.', 'An attempt takes 4 hours and removes the effect permanently. Cannot be performed on yourself. Surgery requires a Medtech.')],
    ],
  },
  {
    key: 'cemkWeaponRules', title: b('Reglas Power / Smart / Tech', 'Power / Smart / Tech rules'), pages: '8, 12',
    description: b('Propiedades de combate del Mission Kit; sin catálogo de equipo.', 'Mission Kit combat properties; no equipment catalog.'),
    rows: [
      ['Power', b('Si causa una lesión crítica, añade 5 a su daño adicional. Un rebote permite alcanzar un objetivo conocido tras cobertura o fuera de visión: −4 al ataque, con camino libre desde el rebote al blanco. Un disparo apuntado aplica solo su propio penalizador, no el −4. Mide el alcance directamente entre tirador y blanco.', 'If it causes a Critical Injury, increase that injury’s Bonus Damage by 5. Ricochet at a known target behind cover or out of sight: −4 to the Attack Check, with a clear path from bounce to target. An Aimed Shot uses only its own penalty, not the −4. Measure range directly from shooter to target.')],
      [b('Power · perdigones', 'Power · shotgun shells'), b('Elige una superficie a 6 m (3 casillas) o menos como nuevo origen del área de perdigones de 6 m (3 casillas). Debe seguir una dirección de rebote físicamente posible.', 'Choose a surface within 6 m/yd (3 squares) as the new origin of the 6 m/yd (3-square) spread. The ricochet direction must be physically plausible.')],
      ['Smart', b('Requiere Personal Link / Interface Plug o Subdermal Grip. +1 a ataques a distancia. Puede usar Improved Smart Ammunition compatible.', 'Requires a Personal Link / Interface Plug or Subdermal Grip. +1 to Ranged Attack Checks. Can use compatible Improved Smart Ammunition.')],
      ['Improved Smart Ammunition', b('Solo en armas Smart. Ignora penalizadores de oscuridad, humo, niebla y otras obstrucciones visuales. Si fallas la DV por 5 o menos, repite inmediatamente contra la misma DV con 1d10 + 14 en lugar de STAT + habilidad + bonificaciones; puedes usar Suerte. Conserva los penalizadores del primer intento.', 'Only in Smart Weapons. Ignore darkness, smoke, fog and other visual-obscurement penalties. If you miss the DV by 5 or less, immediately retry against the same DV with 1d10 + 14 instead of STAT + Skill + bonuses; LUCK is allowed. Retain the first attempt’s penalties.')],
      ['Tech', b('La mira muestra siluetas a través de cobertura fina. Sacrifica el movimiento para cargar; dura hasta disparar o 60 segundos (20 asaltos). El siguiente ataque no explosivo es ROF 1, atraviesa cobertura fina sin dañarla y calcula la protección del blanco como la mitad de SP, redondeada hacia arriba.', 'The scope shows outlines through Thin Cover. Sacrifice the Move Action to charge; lasts until firing or 60 seconds (20 rounds). The next non-explosive attack is ROF 1, passes through Thin Cover without damaging it, and treats the target’s SP as half, rounded up.')],
    ],
  },
  {
    key: 'cemkCover', title: b('Cobertura fina / gruesa', 'Thin / thick cover'), pages: '12',
    description: b('PV por sección de 2 × 2 m (1 casilla). Tech cargada atraviesa cobertura fina. El daño sobrante al destruir cobertura se pierde, salvo explosivos. Puñetazos no dañan acero sin Cyberarm o BODY 10+.', 'HP per 2 × 2 m/yd section (1 square). Charged Tech shots pass through Thin Cover. Excess damage on destroying cover is lost, except for explosives. Brawling cannot damage steel without a Cyberarm or BODY 10+.'),
    headers: [b('Material', 'Material'), b('Ejemplo fino / grueso', 'Thin / thick example'), b('PV fina', 'Thin HP'), b('PV gruesa', 'Thick HP')],
    rows: [
      [b('Yeso / plástico', 'Plaster / plastic'), b('Pladur barato / resistente', 'Cheap / sturdy drywall'), 0, 15],
      [b('Madera', 'Wood'), b('Puerta sencilla / árbol', 'Simple door / tree'), 5, 20],
      [b('Ladrillo / hormigón', 'Brick / concrete'), b('Muro barato / grueso', 'Cheap / thick brick wall'), 10, 25],
      [b('Cristal antibalas', 'Bulletproof glass'), b('Cristal de banco / parabrisas de Delamain', 'Bank teller glass / Delamain windshield'), 15, 30],
      [b('Piedra', 'Stone'), b('Estatua / roca pequeña', 'Statue / small boulder'), 20, 40],
      [b('Acero', 'Steel'), b('Puerta metálica / de seguridad', 'Metal / security door'), 25, 50],
    ],
  },
  {
    key: 'cemkFacedown', title: b('Duelo de miradas · kit', 'Facedown · kit'), pages: '15',
    description: b('Regla rápida del Mission Kit, distinta de la resolución con Reputación del sistema completo de RED.', 'Mission Kit quickstart rule, distinct from the full RED system’s Reputation-based resolution.'),
    rows: [
      [b('Tirada enfrentada', 'Opposed roll'), b('Cada participante tira COOL + 1d10.', 'Each participant rolls COOL + 1d10.')],
      [b('Empate', 'Tie'), b('No ocurre nada.', 'Nothing happens.')],
      [b('Perdedor', 'Loser'), b('Se retira o sufre −2 en futuras tiradas contra ese rival hasta derrotarlo en alguna forma de combate físico o social.', 'Back down, or take −2 to future Checks against that opponent until defeating them in physical or social combat.')],
    ],
  },
  {
    key: 'cemkRoles', title: b('Roles / acceso · RED + CEMK', 'Roles / access · RED + CEMK'), pages: '25–26',
    description: b('Cambios de reglas para ambientar Cyberpunk RED en la era del Mission Kit.', 'Rule changes for running Cyberpunk RED in the Mission Kit era.'),
    rows: [
      [b('Neuroport al crear personaje', 'Neuroport at character creation'), b('Opcional y gratuito: 0 pérdida de Humanidad y no reduce su máximo. Se requiere para instalar ciberware que no sea de grado médico.', 'Optional and free: 0 Humanity Loss and no reduction to Maximum Humanity. Required for non-medical-grade cyberware.')],
      ['Fixer', b('Puede conseguir piezas individualmente aunque no estén disponibles: Caro desde Operator 1; Muy caro desde 4; Lujo desde 7; Superlujo desde 9.', 'May source individual items even when unavailable: Expensive from Operator 1; Very Expensive from 4; Luxury from 7; Super Luxury from 9.')],
      ['Exec / Media / Rockerboy', b('Desde rango 4 de su habilidad de rol: acceso a piezas Caras individualmente, aunque normalmente no estén disponibles.', 'From Role Ability rank 4: source individual Expensive items even when normally unavailable.')],
      ['Lawman', b('Desde rango 4: piezas Caras relacionadas con su trabajo, como armas, armadura u otras que decida el DJ.', 'From rank 4: individual Expensive items related to their job, such as weapons, armor or other GM-approved gear.')],
      ['Nomad', b('Desde Moto 1: vehículos y mejoras individuales aunque normalmente no estén disponibles.', 'From Moto 1: individual vehicles and upgrades even when normally unavailable.')],
      [b('Compra directa', 'Direct purchase'), b('Puedes saltarte el Fixer o mercado nocturno comprando al fabricante o distribuidor autorizado al doble de precio. Un objeto de una sola pieza o personalizado queda a decisión del DJ.', 'Bypass a Fixer or Night Market by buying from the manufacturer or licensed dealer at double price. One-of-a-kind and customized items are at the GM’s discretion.')],
    ],
  },
  {
    key: 'cemkHumanityLoss', title: b('Humanidad · incidentes negativos', 'Humanity · loss incidents'), pages: '28',
    description: b('RED + CEMK · pérdida inmediata por incidentes. Son ejemplos para orientar al DJ.', 'RED + CEMK · immediate loss from incidents. Examples to guide the GM.'),
    headers: [b('Pérdida', 'Loss'), b('Ejemplos de incidente', 'Incident examples')],
    rows: [
      ['1d6', b('Presenciar o participar en tortura; ser torturado; ideación homicida; primera amenaza de muerte creíble; trato injusto del sistema judicial; sufrir un robo consumado.', 'Witness or participate in torture; be tortured; murderous ideation; first credible death threat; unjust treatment by a justice system; be successfully robbed.')],
      ['2d6', b('Presenciar una muerte especialmente atroz; matar por primera vez; trauma físico o mental extremo; un ser querido muere sin estar presente.', 'Witness a particularly gruesome killing; kill for the first time; extreme physical or mental trauma; a loved one dies away from your presence.')],
      ['3d6', b('Participar en el asesinato de un inocente; presenciar el asesinato o muerte violenta de un ser querido.', 'Participate in the murder of an innocent; witness the murder or violent death of a loved one.')],
    ],
  },
  {
    key: 'cemkHumanityGain', title: b('Humanidad · incidentes positivos', 'Humanity · gain incidents'), pages: '28',
    description: b('RED + CEMK · recuperación por incidentes, sin superar la Humanidad máxima.', 'RED + CEMK · recovery from incidents, without exceeding Maximum Humanity.'),
    headers: [b('Ganancia', 'Gain'), b('Ejemplos de incidente', 'Incident examples')],
    rows: [
      ['1d6', b('Derrotar a un enemigo que te amenazaba directamente; victoria simbólica catártica; reconciliarte con un familiar distanciado; hacer un amigo verdadero.', 'Defeat an enemy who directly threatened you; a cathartic symbolic victory; reconcile with estranged family; make a true friend.')],
      ['2d6', b('Salvar una vida. También, una vez al mes: tú y hasta 10 amigos pasáis un día de fiesta y gastáis conjuntamente al menos 1.000 eb; puede atraer atención.', 'Save a life. Also, once per month: you and up to 10 friends spend a full day partying and collectively spend at least 1,000 eb; it might attract attention.')],
      ['3d6', b('Un gran acontecimiento vital: compromiso, boda, adopción, nacimiento o cumplir un sueño. También, una vez al mes: un día de fiesta con hasta 10 amigos gastando conjuntamente al menos 10.000 eb; probablemente atraiga atención.', 'A major life-affirming event: engagement, marriage, adoption, childbirth or fulfilling a dream. Also, once per month: a full day partying with up to 10 friends, collectively spending at least 10,000 eb; it probably attracts attention.')],
    ],
  },
  {
    key: 'cemkHumanityMonthlyLoss', title: b('Humanidad · pérdidas mensuales', 'Humanity · monthly losses'), pages: '29', description: monthlyDescription,
    headers: [b('Pérdida', 'Loss'), b('Condición', 'Condition')],
    rows: [
      ['1d6', b('Elegir un estilo de vida Kibble este mes.', 'Choose a Kibble Lifestyle this month.')],
      ['1d6', b('El mes pasado: estilo de vida distinto de Fresh Food / Good Prepak y pasar la mayor parte del tiempo en una gran ciudad.', 'Last month: a non-Fresh Food / Good Prepak Lifestyle and most of your time in a major city.')],
      ['1d6', b('El mes pasado: dormir principalmente en un hotel cápsula.', 'Last month: primarily sleep in a Cube Hotel.')],
      ['1d6', b('El mes pasado: trabajar directa o indirectamente para una corporación.', 'Last month: work directly or indirectly for a corporation.')],
      ['2d6', b('Un ser querido murió el mes pasado y aún no has celebrado una ceremonia.', 'A loved one died last month and you have not yet held a ceremony.')],
      ['2d6', b('El mes pasado: estado Mortalmente herido una vez o Gravemente herido tres o más veces.', 'Last month: Mortally Wounded once or Seriously Wounded three or more times.')],
      ['2d6', b('El mes pasado: encarcelamiento durante más de una semana.', 'Last month: imprisonment for more than a week.')],
      ['2d6', b('El mes pasado: pasar hambre extrema.', 'Last month: experience starvation.')],
      ['3d6', b('El mes pasado: más de una semana atrapado en una zona de guerra (incluye una Combat Zone) o en la devastación de un desastre prolongado.', 'Last month: more than a week trapped in a war zone (including a Combat Zone) or an area devastated by a long-term disaster.')],
    ],
  },
  {
    key: 'cemkHumanityMonthlyGain', title: b('Humanidad · ganancias mensuales', 'Humanity · monthly gains'), pages: '29', description: monthlyDescription,
    headers: [b('Ganancia', 'Gain'), b('Condición', 'Condition')],
    rows: [
      ['1d6', b('Tener al menos un amigo verdadero e interactuar significativamente al menos una vez el mes pasado.', 'Have at least one true friend and interact meaningfully at least once last month.')],
      ['1d6', b('Interactuar al menos una vez el mes pasado con tu familia, de sangre o elegida.', 'Interact at least once last month with your family, blood or otherwise.')],
      ['1d6', b('El mes pasado: al menos una semana solo de descanso y diversión, sin actividades de tiempo libre regladas ni recuperación de PV o lesiones críticas.', 'Last month: at least one week solely relaxing and having fun, with no downtime activities or healing HP or Critical Injuries.')],
      ['1d6', b('El mes pasado: la mayor parte del tiempo fuera de grandes ciudades, sin penurias ambientales ni de estilo de vida.', 'Last month: most of your time outside major cities without environmental or lifestyle hardship.')],
      ['2d6', b('El mes pasado: estilo de vida Fresh Food.', 'Last month: a Fresh Food Lifestyle.')],
      ['2d6', b('El mes pasado: dormir principalmente en un Corporate Conapt o mejor.', 'Last month: primarily sleep in a Corporate Conapt or better.')],
      ['3d6', b('Cumplir al menos cuatro condiciones de ganancia mensual (sin contar esta), y menos de tres condiciones de pérdida mensual.', 'Qualify for at least four monthly gain conditions (excluding this one), and fewer than three monthly loss conditions.')],
    ],
  },
];

export const missionKitLabels: Record<'es' | 'en', Record<string, string>> = { es: {}, en: {} };
function label(key: string, value: Bilingual): string {
  const fullKey = `cemk.${key}`;
  missionKitLabels.es[fullKey] = value.es;
  missionKitLabels.en[fullKey] = value.en;
  return fullKey;
}
function category(key: string, title: Bilingual, color: string, files: RuleFile[]): GMTableCategory {
  return {
    key, titleKey: label(key, title), color,
    tables: files.map((file): GMTableDef => ({
      key: file.key, color,
      titleKey: label(`${file.key}.title`, file.title),
      descriptionKey: label(`${file.key}.description`, file.description),
      sourceKey: label(`${file.key}.source`, b(
        `Fuente: Cyberpunk: Edgerunners Mission Kit · Rule Book · pp. ${file.pages} (paginación impresa)${file.sheet ? ` · ${file.sheet}` : ''}. Resumen de consulta; traducción propia.`,
        `Source: Cyberpunk: Edgerunners Mission Kit · Rule Book · pp. ${file.pages} (printed pages)${file.sheet ? ` · ${file.sheet}` : ''}. Rules reference summary.`,
      )),
      columns: (file.headers ?? ruleHeaders).map((header, i) => ({ headerKey: label(`${file.key}.header.${i}`, header) })),
      rows: file.rows.map((cells, r) => ({ cells: cells.map((cell, c) => typeof cell === 'object' ? `t:${label(`${file.key}.row.${r}.${c}`, cell)}` : cell) })),
    })),
  };
}
export const missionKitCategories: GMTableCategory[] = [
  category('cemkNetrunning', b('Edgerunners · quickhacks', 'Edgerunners · Quickhacks'), '#EDFF3A', netrunning),
  category('cemkRedNetrunning', b('Netrunning · RED + CEMK', 'Netrunning · RED + CEMK'), '#76FFAF', redNetrunning),
  category('cemkRules', b('Edgerunners · reglas', 'Edgerunners · rules'), '#FF865C', otherRules),
];
