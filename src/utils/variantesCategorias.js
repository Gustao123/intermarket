export const CONFIG_CATEGORIAS = [
  // ============================================================
  // ROPA (ropa americana)
  // ============================================================
  {
    id: "ropa",
    palabrasClave: ["ropa", "camisa", "blusa", "pantalon", "pantalón", "vestido", "falda", "chaqueta", "abrigo", "sudadera", "jeans", "short", "moda", "prenda", "americana"],
    labelSeccion: "Variantes de Ropa",
    icono: "bi-tag",
    labelMedidas: "Tallas",
    medidas: ["Única", "XS", "S", "M", "L", "XL", "XXL", "3XL"],
    placeholderMedidas: "Otras tallas (ej: 32, 34)",
    labelColores: "Colores",
    colores: ["Blanco", "Negro", "Rojo", "Azul", "Verde", "Amarillo", "Gris", "Beige", "Rosa", "Morado", "Café"],
    placeholderColores: "Otros colores (ej: Turquesa)",
  },

  // ============================================================
  // CALZADO
  // ============================================================
  {
    id: "calzado",
    palabrasClave: ["calzado", "zapato", "zapatilla", "tenis", "sandalia", "bota", "botín", "botin", "tacón", "tacon", "chancla", "mocasin", "mocasín", "zueco"],
    labelSeccion: "Tallas y Colores de Calzado",
    icono: "bi-boot",
    labelMedidas: "Tallas de Calzado",
    medidas: ["34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"],
    placeholderMedidas: "Otras tallas (ej: 47, 48)",
    labelColores: "Colores",
    colores: ["Blanco", "Negro", "Rojo", "Azul", "Café", "Beige", "Gris", "Rosa", "Verde", "Amarillo"],
    placeholderColores: "Otros colores",
  },

  // ============================================================
  // ACCESORIOS
  // ============================================================
  {
    id: "accesorios",
    palabrasClave: ["accesorio", "joya", "joyería", "joyeria", "anillo", "cadena", "pulsera", "collar", "reloj", "bolso", "cartera", "mochila", "billetera", "arete", "aretes", "dije", "broche", "tobillera", "esclava", "brazalete"],
    labelSeccion: "Medidas y Colores de Accesorios",
    icono: "bi-gem",
    labelMedidas: "Medidas / Tallas",
    medidas: ["Única", "Ajustable", "Anillo 5", "Anillo 6", "Anillo 7", "Anillo 8", "Anillo 9", "Anillo 10", "15cm", "17cm", "18cm", "19cm", "20cm", "40cm", "45cm", "50cm", "55cm", "60cm"],
    placeholderMedidas: "Otras medidas (ej: Anillo 11, 22cm, Ajustable)",
    labelColores: "Colores / Materiales",
    colores: ["Oro", "Plata", "Dorado", "Plateado", "Cobre", "Rose Gold", "Negro", "Blanco", "Rojo", "Azul", "Verde", "Cristal", "Perla"],
    placeholderColores: "Otros materiales (ej: Acero, Titanio)",
  },

  // ============================================================
  // ANIME
  // ============================================================
  {
    id: "anime",
    palabrasClave: ["anime", "manga", "figura", "cosplay", "póster", "poster", "llavero", "funko", "otaku"],
    labelSeccion: "Opciones de Anime",
    icono: "bi-stars",
    labelMedidas: "Presentación",
    medidas: ["Única", "Estándar", "Edición Especial", "Colección"],
    placeholderMedidas: "Otras presentaciones",
    labelColores: "Temas / Personajes",
    colores: ["Naruto", "One Piece", "Dragon Ball", "Demon Slayer", "My Hero Academia", "Attack on Titan", "Jujutsu Kaisen", "Otro"],
    placeholderColores: "Otros personajes / temas",
  },

  // ============================================================
  // JUGUETES
  // ============================================================
  {
    id: "juguetes",
    palabrasClave: ["juguete", "juguetería", "jugueteria", "niño", "niña", "peluche", "muñeca", "muñeco", "rompecabezas", "puzzle", "lego", "carro de juguete", "juego"],
    labelSeccion: "Opciones de Juguetes",
    icono: "bi-controller",
    labelMedidas: "Presentación",
    medidas: ["Única", "Pequeño", "Mediano", "Grande", "Edición Especial"],
    placeholderMedidas: "Otras presentaciones (ej: Mini, Jumbo)",
    labelColores: "Colores",
    colores: ["Multicolor", "Azul", "Rosa", "Rojo", "Verde", "Amarillo", "Blanco", "Negro", "Morado"],
    placeholderColores: "Otros colores",
  },

  // ============================================================
  // MASCOTA
  // ============================================================
  {
    id: "mascota",
    palabrasClave: ["mascota", "perro", "gato", "pet", "alimento mascota", "juguete mascota", "accesorio mascota", "correa", "collar mascota", "arena", "cama mascota"],
    labelSeccion: "Opciones para Mascotas",
    icono: "bi-heart",
    labelMedidas: "Tamaño",
    medidas: ["Única", "XS", "S", "M", "L", "XL"],
    placeholderMedidas: "Otros tamaños (ej: XXL, Mini)",
    labelColores: "Colores",
    colores: ["Multicolor", "Azul", "Rosa", "Rojo", "Verde", "Café", "Negro", "Blanco", "Amarillo"],
    placeholderColores: "Otros colores",
  },
];

/**
 * Detecta la configuración según el nombre de una categoría.
 * Devuelve null si no encuentra coincidencia.
 */
export function obtenerConfigCategoria(nombreCategoria) {
  if (!nombreCategoria) return null;
  const nombre = String(nombreCategoria).toLowerCase().trim();

  for (const config of CONFIG_CATEGORIAS) {
    for (const palabra of config.palabrasClave) {
      if (nombre.includes(palabra)) {
        return config;
      }
    }
  }

  return null;
}

/**
 * Detecta la configuración por id_categoria + lista de categorías.
 */
export function obtenerConfigCategoriaPorId(idCategoria, categorias) {
  if (!idCategoria || !Array.isArray(categorias)) return null;

  const cat = categorias.find(
    (c) => String(c.id_categoria) === String(idCategoria)
  );

  if (!cat) return null;
  return obtenerConfigCategoria(cat.nombre_categoria);
}