// src/utils/moderacion.js
// Sistema de moderación de productos por palabras clave.
// 100% offline, sin dependencias externas, sin límites.

// ============================================================
// CATEGORÍAS PROHIBIDAS Y SUS PALABRAS CLAVE
// ============================================================

export const CATEGORIAS_PROHIBIDAS = [
  // ============================================================
  // 1. DROGAS Y ESTUPEFACIENTES
  // ============================================================
  {
    cat: "Drogas",
    peso: 100,
    palabras: [
      "droga", "drogas", "cocaina", "kokaina", "heroina", "metanfetamina",
      "metanfetaminas", "cristal meth", "meth", "fentanyl", "fentanilo",
      "carfentanilo", "opiode", "opioide", "opio", "opiaceo", "morfina",
      "codeina", "oxicodona", "hidrocodona", "tramadol", "percocet",
      "vicodin", "demerol", "crack", "basuco", "paco", "chespi", "mona",
      "lsd", "acido lisergico", "dmt", "ayahuasca", "5-meo-dmt",
      "psilocibina", "hongos magicos", "peyote", "mescalina",
      "salvia divinorum", "2cb", "25i-nbome", "nbome", "dom",
      "extasis", "mdma", "molly", "m0lly", "tacha",
      "anfetamina", "anfetaminas", "speed", "cristal", "hielo",
      "popper", "ghb", "ketamina", "keta",
      "marihuana", "mariguana", "cannabis", "hachis", "hashi",
      "kief", "bho", "dab", "shatter",
      "perico", "hierba", "mota", "nieve", "blanca", "farlopa",
      "chiva", "caballo", "piedra", "merla",
      "spice", "k2", "kratom", "pope", "sales de baño", "bath salts",
      "xanax", "valium", "rivotril", "clonazepam", "diazepam",
      "alprazolam", "lorazepam", "zolpidem", "ambien", "adderall",
      "ritalin", "concerta", "vyvanse", "modafinilo",
      "pastilla azul", "pastillas azules", "medicamento controlado",
      "medicamento sin receta", "sin receta medica", "receta medica",
      "sustancia controlada", "estimulante", "alucinogeno",
      "psicodelico", "narco", "narcotrafico",
    ],
  },

  // ============================================================
  // 2. ARMAS Y EXPLOSIVOS
  // ============================================================
  {
    cat: "Armas",
    peso: 100,
    palabras: [
      "pistola", "pistolas", "revolver", "rifle", "rifles", "fusil",
      "fusiles", "escopeta", "escopetas", "ametralladora", "subfusil",
      "metralleta", "carabina", "francotirador", "sniper",
      "arma de fuego", "armas de fuego", "arma larga", "arma corta",
      "glock", "beretta", "smith wesson", "colt", "remington",
      "sig sauer", "ar15", "ar-15", "ak47", "ak-47", "m16", "m4",
      "uzi", "mp5", "kalashnikov", "browning", "walther", "ruger",
      "municion", "municiones", "bala", "balas", "cartucho", "cartuchos",
      "proyectil", "proyectiles", "polvora", "casquillo", "casquillos",
      "perdigones", "postas",
      "explosivo", "explosivos", "granada", "granadas", "c4", "dinamita",
      "tatp", "tnt", "nitroglicerina", "amonal", "semtex", "rdx",
      "detonador", "detonadores", "mecha", "fulminante",
      "cuchillo mariposa", "cuchillo tactico", "puñal", "daga",
      "navaja", "navaja automatica", "arma blanca", "manopla",
      "nunchaku", "chaku", "tonfa", "baston extensible", "porra",
      "macana", "estrellas ninja", "shuriken", "katana", "sable",
      "machete",
      "silenciador", "supresor", "mira telescopica", "cargador extendido",
      "culata tactica", "auto sear", "glock switch", "kit de conversion",
      "modificacion de arma",
      "taser", "paralizador", "gas pimienta", "spray pimienta",
      "baston policial",
    ],
  },

  // ============================================================
  // 3. FRAUDE Y ESTAFAS
  // ============================================================
  {
    cat: "Fraude",
    peso: 100,
    palabras: [
      "clonada", "clonado", "clonar", "tarjeta clonada", "tarjetas clonadas",
      "dinero facil", "dinero falso", "billetes falsos", "monedas falsas",
      "multiplica tu dinero", "duplica tu dinero", "triplica tu dinero",
      "inversion garantizada", "esquema ponzi", "ponzi", "piramide",
      "criptoestafa", "rug pull", "fondo de inversion sin registro",
      "hackeo", "hackear", "hackeado", "cuentas robadas", "cuenta robada",
      "phishing", "malware", "software malicioso", "ransomware",
      "hackear whatsapp", "hackear facebook", "hackear instagram",
      "hackear correo", "hackear celular", "hackear telefono",
      "servicio de hackeo", "hackeo profesional",
      "espiar pareja", "espiar celular", "espiar telefono", "espiar whatsapp",
      "rastreador de ubicacion", "app espia", "software espia",
      "interceptar llamadas", "interceptar mensajes",
      "estafa", "estafador", "estafadores", "fraude", "defraudar",
      "suplantacion", "suplantar identidad",
      "streaming gratis", "streaming ilegal", "netflix gratis",
      "spotify gratis", "hbo gratis", "disney gratis", "prime gratis",
      "cuentas streaming", "iptv pirata", "iptv gratis", "cable gratis",
      "señal pirata", "señal gratis",
      "bitcoin gratis", "criptomoneda gratis", "mineria gratis",
      "mineria bitcoin", "inversion cripto",
      "documento falso", "documentos falsos", "cedula falsa",
      "pasaporte falso", "visa falsa", "licencia falsa",
      "licencia de conducir falsa", "carnet falso", "identidad falsa",
      "acta de nacimiento falsa", "titulo falso", "diploma falso",
      "certificado falso", "titulo universitario falso",
      "green card falsa", "tarjeta de residencia falsa",
      "documento migratorio falso", "referidos ilimitados",
    ],
  },

  // ============================================================
  // 4. CONTENIDO ADULTO
  // ============================================================
  {
    cat: "Contenido Adulto",
    peso: 100,
    palabras: [
      "porno", "pornografia", "xxx", "contenido adulto", "contenido +18",
      "contenido para adultos", "material adulto",
      "prostitucion", "servicios sexuales", "servicio sexual",
      "escort", "escorts", "acompañante", "sugar daddy", "sugar baby",
      "masajes con final", "masaje con final", "masajista erotica",
      "masajes eroticos", "onlyfans", "pack de fotos", "packs de fotos",
      "pack de videos", "packs de videos", "video intimo", "videos intimos",
      "contenido intimo", "fotos hot", "fotos picantes", "videos hot",
      "sex shop", "sexshop", "juguetes sexuales", "juguete sexual",
      "lenceria erotica", "lenceria sexy", "fetiche", "fetish", "bdsm",
      "bondage", "dominatrix", "consolador", "dildo", "vibrador",
      "plug anal", "bolas chinas", "sexo", "erotico", "erotica",
      "desnudos", "desnudo", "desnuda", "desnudas", "striptease",
      "baile erotico",
    ],
  },

  // ============================================================
  // 5. FALSIFICACIONES Y PIRATERÍA
  // ============================================================
  {
    cat: "Falsificaciones",
    peso: 100,
    palabras: [
      "replica", "replicas", "imitacion", "imitaciones", "copia", "copias",
      "bolsos replica", "perfumes replica", "ropa replica", "tenis replica",
      "zapatos replica", "reloj replica", "iphone replica", "marca replica",
      "1:1", "aaa replica", "grado aaa", "espejo 1:1",
      "software pirata", "software crackeado", "crackeado", "crackear",
      "windows pirata", "office pirata", "photoshop pirata", "adobe pirata",
      "autocad pirata", "juegos piratas", "juego pirata",
      "videojuego pirata", "pelicula pirata", "peliculas piratas",
      "serie pirata", "series piratas",
      "boletos falsos", "boleto falso", "entradas falsas",
      "tickets falsos", "ticket falso",
      "estampillas falsas", "estampilla falsa",
    ],
  },

  // ============================================================
  // 6. SERVICIOS ILEGALES
  // ============================================================
  {
    cat: "Servicios Ilegales",
    peso: 100,
    palabras: [
      "sicario", "sicarios", "maton", "matones a sueldo",
      "cobrador de deudas violento", "cobrador violento",
      "peleas clandestinas", "pelea clandestina",
      "pelea de perros", "peleas de perros", "pelea de gallos",
      "peleas de gallos",
      "trafico de personas", "trata de personas",
      "trafico de organos", "venta de organos", "venta de ovulos",
      "venta de sangre", "venta de plasma",
      "vientre subrogado", "vientre de alquiler",
      "contrabando", "mercancia ilegal", "productos de contrabando",
      "casino online sin licencia", "apuestas sin licencia",
      "apuestas deportivas sin permiso", "rifa ilegal",
      "sorteo sin permiso", "ruleta ilegal", "juego clandestino",
      "aborto clandestino", "aborto ilegal", "cirugia clandestina",
      "medico sin licencia", "dentista sin licencia",
      "tatuador sin licencia",
    ],
  },

  // ============================================================
  // 7. ESPECIES PROTEGIDAS
  // ============================================================
  {
    cat: "Especies Protegidas",
    peso: 100,
    palabras: [
      "marfil", "colmillo", "colmillos", "cuerno de rinoceronte",
      "piel de tigre", "piel de leopardo", "piel de jaguar",
      "tortuga carey", "carey", "piel de cocodrilo", "piel de caiman",
      "piel de serpiente", "piel de piton",
      "tigre", "leopardo", "jaguar", "puma", "leon", "elefante",
      "rinoceronte", "orangutan", "chimpance", "gorila", "panda",
      "tucan", "guacamaya", "guacamayo", "loro cabeza amarilla", "cotorra",
      "cocobolo", "caoba", "cedro real", "rosewood", "palisandro",
      "especie protegida", "especies protegidas", "animal exotico",
      "trafico de animales", "caza furtiva", "cazador furtivo",
      "huevos de tortuga", "tortuga marina",
    ],
  },

  // ============================================================
  // 8. PRODUCTOS REGULADOS
  // ============================================================
  {
    cat: "Productos Regulados",
    peso: 80,
    palabras: [
      "vape", "vapeador", "vapeadores", "cigarrillo electronico",
      "puff bar", "puffbar", "juul", "nicotina liquida", "eliquido",
      "e-liquid", "vape desechable", "vape recargable",
      "alcohol artesanal", "licor casero", "destilado casero",
      "viagra", "cialis", "levitra", "sildenafil", "tadalafil",
      "antibiotico sin receta", "ivermectina", "hidroxicloroquina",
      "ozempic", "saxenda", "wegovy", "mounjaro", "semaglutida",
      "tirzepatida", "esteroides", "anabolicos",
      "testosterona inyectable", "hormona de crecimiento", "hgh",
      "dianabol", "clenbuterol", "efedrina", "dmaa",
    ],
  },

  // ============================================================
  // 9. DATOS PERSONALES
  // ============================================================
  {
    cat: "Datos Personales",
    peso: 100,
    palabras: [
      "base de datos de clientes", "base de datos filtrada",
      "padron electoral", "lista de telefonos", "correos filtrados",
      "contrasenas", "password", "passwords", "credenciales",
      "datos bancarios", "cvv", "tarjetas de credito filtradas",
      "cvv filtrado", "informacion confidencial", "expedientes medicos",
      "historial clinico", "datos de menores", "datos biometricos",
    ],
  },

  // ============================================================
  // 10. CONTENIDO PELIGROSO / AUTOLESIÓN
  // ============================================================
  {
    cat: "Contenido Peligroso",
    peso: 100,
    palabras: [
      "como lastimarse", "metodos de suicidio", "como suicidarse",
      "pastillas para morir", "formas de morir", "pro-ana", "proana",
      "pro-mia", "promia", "anorexia tips", "bulimia tips",
      "dietas extremas", "como dejar de comer", "trucos para no comer",
      "trucos para vomitar", "droga para menores", "droga para niños",
      "como matar", "como envenenar", "veneno casero",
      "veneno para personas", "como secuestrar", "como torturar",
    ],
  },

  // ============================================================
  // 11. PROTECCIÓN DE MENORES
  // ============================================================
  {
    cat: "Protección de Menores",
    peso: 100,
    palabras: [
      "contenido cp", "child porn", "cp ilegal", "menor desnuda",
      "menor desnudo", "niña desnuda", "niño desnudo",
      "contenido infantil", "contenido pedofilo", "escolar para adultos",
      "colegiala sexual", "adolescente para adultos", "menor para adultos",
      "venta de menores", "trafico de menores",
    ],
  },

  // ============================================================
  // 12. SUSTANCIAS PELIGROSAS
  // ============================================================
  {
    cat: "Sustancias Peligrosas",
    peso: 100,
    palabras: [
      "acido sulfurico concentrado", "acido clorhidrico", "acido nitrico",
      "peroxido de acetona", "clorato de potasio",
      "permanganato de potasio", "mercurio", "cianuro", "arsenico",
      "ricina", "toxina botulinica", "antrax", "gas nervioso",
      "gas sarin", "quimico para dañar",
    ],
  },

  // ============================================================
  // 13. SOSPECHOSO (peso menor, solo suma puntos)
  // ============================================================
  {
    cat: "Sospechoso",
    peso: 40,
    palabras: [
      "discreto", "sin preguntas", "sin factura", "sin garantia",
      "efectivo solamente", "solo efectivo", "pago en efectivo",
      "envio discreto", "paquete discreto",
      "no rastreable", "sin rastro", "anonimo",
      "contactame al", "whatsapp personal", "solo whatsapp",
      "link en bio",
    ],
  },
];

// ============================================================
// NORMALIZACIÓN DE TEXTO
// ============================================================

/**
 * Normaliza el texto:
 *  - minúsculas
 *  - sin acentos
 *  - leetspeak → letras normales
 *  - sin espacios, símbolos ni separadores (para detectar "d r o g a")
 */
function normalizarTexto(texto) {
  if (!texto) return "";

  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/0/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[3€]/g, "e")
    .replace(/[4@]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[7+]/g, "t")
    .replace(/ø/g, "o")
    .replace(/[\s\-_.·•*\/\\,;:!¡?¿"'`´()[\]{}<>«»]/g, "");
}

/**
 * Normaliza pero conserva espacios (para frases como "pastilla azul").
 */
function normalizarConEspacios(texto) {
  if (!texto) return "";

  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Genera variantes leetspeak de una palabra.
 */
function obtenerVariantes(palabra) {
  const base = normalizarTexto(palabra);
  const variantes = new Set([base]);

  variantes.add(base.replace(/o/g, "0"));
  variantes.add(base.replace(/a/g, "4"));
  variantes.add(base.replace(/e/g, "3"));
  variantes.add(base.replace(/i/g, "1"));
  variantes.add(base.replace(/s/g, "5"));

  return [...variantes];
}

// ============================================================
// FUNCIÓN PRINCIPAL DE ANÁLISIS
// ============================================================

/**
 * Analiza el nombre y la descripción de un producto
 * buscando palabras prohibidas y sus variantes.
 *
 * Devuelve:
 *  { aprobado: true, score: N }
 *  { aprobado: false, motivo, categoria_infraccion, nivel_riesgo, score }
 */
export function analizarSeguridadProducto(producto) {
  try {
    const nombre = producto?.nombre_producto || "";
    const descripcion = producto?.descripcion || "";

    const textoSinEspacios = normalizarTexto(`${nombre} ${descripcion}`);
    const textoConEspacios = normalizarConEspacios(`${nombre} ${descripcion}`);

    let scoreTotal = 0;
    const categoriasDetectadas = [];

    for (const patron of CATEGORIAS_PROHIBIDAS) {
      for (const palabra of patron.palabras) {
        // Frases con espacio: buscar en texto con espacios
        if (palabra.includes(" ")) {
          if (textoConEspacios.includes(palabra)) {
            scoreTotal += patron.peso;
            if (!categoriasDetectadas.includes(patron.cat)) {
              categoriasDetectadas.push(patron.cat);
            }
          }
          continue;
        }

        // Palabras sueltas: buscar variantes en texto sin espacios
        const variantes = obtenerVariantes(palabra);
        for (const variante of variantes) {
          if (variante.length >= 3 && textoSinEspacios.includes(variante)) {
            scoreTotal += patron.peso;
            if (!categoriasDetectadas.includes(patron.cat)) {
              categoriasDetectadas.push(patron.cat);
            }
            break;
          }
        }
      }
    }

    // Umbral de bloqueo: 100 puntos o más
    if (scoreTotal >= 100) {
      return {
        aprobado: false,
        nivel_riesgo: scoreTotal >= 200 ? "muy alto" : "alto",
        score: scoreTotal,
        motivo: `El producto parece estar relacionado con contenido prohibido (${categoriasDetectadas.join(", ")}), lo cual viola nuestras políticas de seguridad.`,
        categoria_infraccion: categoriasDetectadas[0] || "Contenido Prohibido",
      };
    }

    return {
      aprobado: true,
      nivel_riesgo: "bajo",
      score: scoreTotal,
      motivo: "",
      categoria_infraccion: "Ninguna",
    };
  } catch (err) {
    console.error("Error en moderación:", err);
    return { aprobado: true, score: 0 };
  }
}