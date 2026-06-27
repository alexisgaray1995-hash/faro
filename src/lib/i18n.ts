// Spanish-first i18n (Golden Rule #7). es is the default and the source of
// truth for the Dict shape; en must match it (enforced by `satisfies Dict`).
// ponytail: covers the public/citizen journey. The login-gated team dashboards
// (/panel, /coordinador) stay Spanish — local responders — translate them when
// international teams onboard.

export type Locale = "es" | "en";
export const LOCALES: Locale[] = ["es", "en"];
export const isLocale = (v: unknown): v is Locale => v === "es" || v === "en";
export const OTHER: Record<Locale, Locale> = { es: "en", en: "es" };
// Label for the toggle: shows the language you'd switch TO.
export const SWITCH_LABEL: Record<Locale, string> = {
  es: "English",
  en: "Español",
};

const es = {
  brandTagline: "Ayuda en emergencias, funcione o no el internet.",
  sync: {
    checking: "Comprobando conexión…",
    online: "En línea",
    offline: "Sin conexión — la app sigue funcionando",
  },
  home: {
    heading: "¿Qué necesitas?",
    intro:
      "Pedir ayuda es anónimo y funciona sin internet. Tu ubicación se toma con el GPS del teléfono.",
    chooseLabel: "Elige una opción",
    reportLabel: "Reportar",
    reportHazard: "Reportar un peligro",
    reportMissing: "Reportar persona desaparecida",
    myPanel: "Mi panel de equipo",
    footer:
      "Faro es una herramienta gratuita y de código abierto. Sin anuncios, sin rastreo.",
  },
  report: {
    back: "Inicio",
    location: "Ubicación del reporte",
    locating: "Obteniendo ubicación…",
    locationReady: "✓ Ubicación lista — actualizar",
    useLocation: "📍 Usar ubicación",
    noGeo: "Tu dispositivo no permite ubicación. Escribe una referencia abajo.",
    geoFailed: "No pudimos obtener tu ubicación. Escribe una referencia abajo.",
    submitting: "Enviando…",
    worksOffline: "Funciona sin internet. Se guarda y se envía solo.",
    sentTitle: "Reporte enviado",
    queuedTitle: "Guardado — se enviará al volver el internet",
    sentBody: "Gracias. Un equipo lo revisará y verificará.",
    queuedBody:
      "Tu reporte está guardado en este teléfono y se enviará solo cuando haya conexión.",
    backHome: "Volver al inicio",
  },
  hazard: {
    title: "Reportar un peligro",
    subtitle: "Avisa de un peligro para que otros lo eviten.",
    type: "Tipo de peligro",
    severity: "Gravedad",
    describe: "Describe el peligro (opcional)",
    describePlaceholder: "Ej: cables caídos cruzando la calle",
    describePublic: "Este aviso es público. No incluyas datos personales.",
    addressPlaceholder: "Referencia: calle, edificio, punto conocido",
    submit: "Enviar reporte",
    needLocation: "Necesitamos la ubicación del peligro.",
  },
  missing: {
    title: "Reportar persona desaparecida",
    subtitle:
      "Estos datos ayudan a localizar a la persona. Trátalos con cuidado.",
    fullName: "Nombre completo",
    age: "Edad (opcional)",
    lastSeen: "¿Dónde se le vio por última vez?",
    lastSeenPlaceholder: "Lugar o referencia conocida",
    describe: "Señas o detalles (opcional)",
    describePlaceholder: "Ropa, estatura, condición médica…",
    contactSummary: "Tus datos de contacto (opcional)",
    contactNote: "Solo los equipos verán esto, para coordinar contigo.",
    reporterName: "Tu nombre",
    reporterPhone: "Tu teléfono",
    submit: "Enviar reporte",
    needName: "Escribe el nombre de la persona.",
  },
  roles: {
    citizen: "Necesito ayuda",
    volunteer: "Quiero ayudar",
    coordinator: "Soy coordinador",
  },
  sos: {
    title: "Pedir ayuda",
    subtitle:
      "Sin cuenta y sin internet. Cuéntanos qué necesitas y dónde estás.",
    back: "Inicio",
    whatNeed: "¿Qué necesitas?",
    urgency: "Urgencia",
    howMany: "¿Cuántas personas?",
    describe: "Describe la situación (opcional)",
    describePlaceholder: "Ej: personas atrapadas en el segundo piso",
    describePublic:
      "Este mensaje es público. No pongas tu nombre, teléfono ni dirección aquí — para eso están los datos de contacto abajo.",
    yourLocation: "Tu ubicación",
    locating: "Obteniendo ubicación…",
    locationReady: "✓ Ubicación lista — actualizar",
    useLocation: "📍 Usar mi ubicación",
    addressPlaceholder: "Referencia: calle, edificio, punto conocido",
    contactSummary: "Datos de contacto (opcional)",
    contactNote:
      "Solo los equipos de rescate verán esto. Ayuda a que te encuentren.",
    name: "Nombre",
    phone: "Teléfono",
    submit: "Enviar pedido de ayuda",
    submitting: "Enviando…",
    worksOffline: "Funciona sin internet. Tu pedido se guarda y se envía solo.",
    noGeo: "Tu dispositivo no permite ubicación. Escribe una referencia abajo.",
    geoFailed: "No pudimos obtener tu ubicación. Escribe una referencia abajo.",
    needLocation: "Necesitamos tu ubicación para enviar ayuda.",
    sentTitle: "Ayuda solicitada",
    queuedTitle: "Guardado — se enviará al volver el internet",
    sentBody: "Tu pedido llegó. Un equipo lo revisará y verificará.",
    queuedBody:
      "Tu pedido está guardado en este teléfono y se enviará solo cuando haya conexión. Puedes cerrar la app.",
    backHome: "Volver al inicio",
  },
  find: {
    title: "Buscar ayuda",
    intro: "Agua, comida, refugios, clínicas y peligros reportados cerca.",
    back: "Inicio",
    tabs: { resources: "Ayuda", hazards: "Peligros", needs: "Pedidos" },
    stale:
      "Sin conexión — mostrando datos guardados, pueden estar desactualizados.",
    loading: "Cargando…",
    error:
      "No se pudieron cargar los datos y no hay copia guardada. Conéctate e intenta de nuevo.",
    empty: "No hay nada reportado por ahora.",
    closed: "Cerrado",
    viewMap: "Ver en mapa",
    teamAccess: "Acceso para voluntarios y equipos",
    exportData: "Descargar datos (CSV / GeoJSON)",
    youAreHere: "Estás aquí",
    directions: "Cómo llegar",
    mapHint:
      "El mapa necesita internet para cargar. La lista de abajo funciona sin conexión.",
  },
  acceso: {
    title: "Acceso para equipos",
    back: "Inicio",
    intro:
      "Solo para voluntarios y coordinadores. Si necesitas ayuda, no hace falta cuenta:",
    askHelp: "pedir ayuda",
    error: "Correo o contraseña incorrectos. Intenta de nuevo.",
    check: "Te enviamos un correo para confirmar tu cuenta. Revísalo y entra.",
    email: "Correo",
    password: "Contraseña",
    submit: "Entrar",
    noAccount: "¿Eres voluntario nuevo?",
    register: "Crear cuenta",
  },
  registro: {
    title: "Crear cuenta de equipo",
    back: "Inicio",
    intro:
      "Para voluntarios y rescatistas. Rápido y sin complicaciones. Si necesitas ayuda, no hace falta cuenta:",
    askHelp: "pedir ayuda",
    error: "No se pudo crear la cuenta. Revisa el correo y la contraseña.",
    name: "Tu nombre (opcional)",
    email: "Correo",
    password: "Contraseña (mín. 6 caracteres)",
    submit: "Crear cuenta",
    haveAccount: "¿Ya tienes cuenta?",
    signIn: "Entrar",
  },
};

export type Dict = typeof es;

const en = {
  brandTagline: "Emergency help, with or without the internet.",
  sync: {
    checking: "Checking connection…",
    online: "Online",
    offline: "Offline — the app still works",
  },
  home: {
    heading: "What do you need?",
    intro:
      "Asking for help is anonymous and works without internet. Your location comes from the phone's GPS.",
    chooseLabel: "Choose an option",
    reportLabel: "Report",
    reportHazard: "Report a hazard",
    reportMissing: "Report a missing person",
    myPanel: "My team panel",
    footer: "Faro is a free, open-source tool. No ads, no tracking.",
  },
  report: {
    back: "Home",
    location: "Report location",
    locating: "Getting location…",
    locationReady: "✓ Location ready — update",
    useLocation: "📍 Use location",
    noGeo: "Your device doesn't allow location. Write a reference below.",
    geoFailed: "We couldn't get your location. Write a reference below.",
    submitting: "Sending…",
    worksOffline: "Works without internet. It's saved and sent automatically.",
    sentTitle: "Report sent",
    queuedTitle: "Saved — it will send when the internet is back",
    sentBody: "Thank you. A team will review and verify it.",
    queuedBody:
      "Your report is saved on this phone and will send by itself once there's a connection.",
    backHome: "Back to home",
  },
  hazard: {
    title: "Report a hazard",
    subtitle: "Warn others about a hazard so they can avoid it.",
    type: "Hazard type",
    severity: "Severity",
    describe: "Describe the hazard (optional)",
    describePlaceholder: "E.g. downed power lines across the street",
    describePublic: "This report is public. Don't include personal details.",
    addressPlaceholder: "Reference: street, building, known landmark",
    submit: "Send report",
    needLocation: "We need the hazard's location.",
  },
  missing: {
    title: "Report a missing person",
    subtitle: "This information helps locate the person. Handle it with care.",
    fullName: "Full name",
    age: "Age (optional)",
    lastSeen: "Where were they last seen?",
    lastSeenPlaceholder: "Place or known landmark",
    describe: "Marks or details (optional)",
    describePlaceholder: "Clothing, height, medical condition…",
    contactSummary: "Your contact details (optional)",
    contactNote: "Only teams will see this, to coordinate with you.",
    reporterName: "Your name",
    reporterPhone: "Your phone",
    submit: "Send report",
    needName: "Write the person's name.",
  },
  roles: {
    citizen: "I need help",
    volunteer: "I want to help",
    coordinator: "I'm a coordinator",
  },
  sos: {
    title: "Ask for help",
    subtitle:
      "No account, no internet needed. Tell us what you need and where you are.",
    back: "Home",
    whatNeed: "What do you need?",
    urgency: "Urgency",
    howMany: "How many people?",
    describe: "Describe the situation (optional)",
    describePlaceholder: "E.g. people trapped on the second floor",
    describePublic:
      "This message is public. Don't put your name, phone, or address here — use the contact fields below for that.",
    yourLocation: "Your location",
    locating: "Getting location…",
    locationReady: "✓ Location ready — update",
    useLocation: "📍 Use my location",
    addressPlaceholder: "Reference: street, building, known landmark",
    contactSummary: "Contact details (optional)",
    contactNote: "Only rescue teams will see this. It helps them find you.",
    name: "Name",
    phone: "Phone",
    submit: "Send help request",
    submitting: "Sending…",
    worksOffline:
      "Works without internet. Your request is saved and sent automatically.",
    noGeo: "Your device doesn't allow location. Write a reference below.",
    geoFailed: "We couldn't get your location. Write a reference below.",
    needLocation: "We need your location to send help.",
    sentTitle: "Help requested",
    queuedTitle: "Saved — it will send when the internet is back",
    sentBody: "Your request arrived. A team will review and verify it.",
    queuedBody:
      "Your request is saved on this phone and will send by itself once there's a connection. You can close the app.",
    backHome: "Back to home",
  },
  find: {
    title: "Find help",
    intro: "Water, food, shelters, clinics and reported hazards nearby.",
    back: "Home",
    tabs: { resources: "Help", hazards: "Hazards", needs: "Requests" },
    stale: "Offline — showing saved data, it may be out of date.",
    loading: "Loading…",
    error:
      "Couldn't load the data and there's no saved copy. Connect and try again.",
    empty: "Nothing reported yet.",
    closed: "Closed",
    viewMap: "View on map",
    teamAccess: "Access for volunteers and teams",
    exportData: "Download data (CSV / GeoJSON)",
    youAreHere: "You are here",
    directions: "Directions",
    mapHint: "The map needs internet to load. The list below works offline.",
  },
  acceso: {
    title: "Team access",
    back: "Home",
    intro:
      "For volunteers and coordinators only. If you need help, no account is required:",
    askHelp: "ask for help",
    error: "Wrong email or password. Try again.",
    check:
      "We sent you an email to confirm your account. Check it and sign in.",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    noAccount: "New volunteer?",
    register: "Create account",
  },
  registro: {
    title: "Create a team account",
    back: "Home",
    intro:
      "For volunteers and rescuers. Fast and simple. If you need help, no account is required:",
    askHelp: "ask for help",
    error: "Couldn't create the account. Check the email and password.",
    name: "Your name (optional)",
    email: "Email",
    password: "Password (min. 6 characters)",
    submit: "Create account",
    haveAccount: "Already have an account?",
    signIn: "Sign in",
  },
} satisfies Dict;

export const dict: Record<Locale, Dict> = { es, en };
export const getDict = (l: Locale): Dict => dict[l];

// Bilingual domain labels for the citizen path. Spanish maps stay in domain.ts;
// these add English so categories/urgencies/types render in the chosen locale.
export const NEED_CATEGORY_EN = {
  rescue: "Rescue",
  medical: "Medical",
  water: "Water",
  food: "Food",
  shelter: "Shelter",
  evacuation: "Evacuation",
  other: "Other",
} as const;

export const URGENCY_EN = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

export const RESOURCE_TYPE_EN = {
  water_point: "Water",
  food_distribution: "Food",
  shelter: "Shelter",
  clinic: "Clinic",
  charging_station: "Charging",
  distribution_center: "Distribution center",
  other: "Other",
} as const;

export const HAZARD_TYPE_EN = {
  building_collapse: "Building collapse",
  fire: "Fire",
  flood: "Flood",
  gas_leak: "Gas leak",
  road_blocked: "Road blocked",
  power_line: "Power line",
  aftershock: "Aftershock",
  other: "Other",
} as const;

export const VERIFICATION_EN = {
  verified: "Verified",
  disputed: "Disputed",
  unverified: "Unverified",
} as const;
