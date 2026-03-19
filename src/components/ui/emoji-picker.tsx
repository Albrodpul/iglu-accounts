"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";

const EMOJI_KEYWORDS: Record<string, string> = {
  "💰": "dinero money bolsa",
  "💵": "billete dolar dinero",
  "💶": "euro billete dinero",
  "💷": "libra billete dinero",
  "💸": "dinero volando gasto",
  "💳": "tarjeta credito debito pago",
  "🪙": "moneda coin",
  "🏦": "banco bank",
  "🧾": "recibo factura ticket",
  "💲": "dolar precio",
  "📊": "grafico estadistica",
  "📈": "subida beneficio",
  "📉": "bajada perdida",
  "🛒": "carrito compra supermercado",
  "🛍️": "bolsas compras shopping",
  "🏪": "tienda comercio",
  "🏬": "centro comercial",
  "💎": "diamante joya lujo",
  "🎰": "casino apuesta",
  "🤑": "dinero rico",
  "🏠": "casa home hogar",
  "🏡": "casa jardin hogar",
  "🏢": "edificio oficina",
  "🛖": "cabaña refugio",
  "🏗️": "construccion obra",
  "🔑": "llave casa",
  "🛋️": "sofa salon mueble",
  "🛏️": "cama dormitorio",
  "🪴": "planta maceta",
  "🧹": "escoba limpieza",
  "🧺": "cesta colada ropa",
  "🪣": "cubo limpieza",
  "🔧": "llave herramienta",
  "🔨": "martillo herramienta",
  "🪛": "destornillador herramienta",
  "💡": "bombilla luz idea",
  "🔌": "enchufe electricidad",
  "🚿": "ducha baño agua",
  "🛁": "bañera baño",
  "🧯": "extintor seguridad",
  "🪟": "ventana cristal",
  "🚪": "puerta casa",
  "🧊": "hielo frio",
  "♨️": "caliente agua termal",
  "🍕": "pizza comida",
  "🍔": "hamburguesa comida",
  "🍟": "patatas fritas comida",
  "🌮": "taco mexicano comida",
  "🌯": "burrito wrap comida",
  "🥗": "ensalada comida sana",
  "🍣": "sushi japones comida",
  "🍱": "bento japones comida",
  "🍜": "ramen sopa comida",
  "🍝": "pasta espagueti comida",
  "🥘": "paella guiso comida",
  "🍳": "huevo frito desayuno",
  "🥐": "croissant desayuno pan",
  "🍞": "pan comida",
  "🧀": "queso comida",
  "🥩": "carne comida",
  "🍖": "carne hueso comida",
  "🥚": "huevo comida",
  "🥛": "leche bebida",
  "🧃": "zumo brick bebida",
  "☕": "cafe desayuno bebida",
  "🍺": "cerveza bar bebida",
  "🍷": "vino bebida",
  "🥤": "refresco bebida",
  "🍰": "tarta postre dulce",
  "🎂": "cumpleaños tarta celebracion",
  "🍫": "chocolate dulce",
  "🍩": "donut dulce",
  "🍪": "galleta dulce",
  "🍎": "manzana fruta",
  "🍌": "platano fruta",
  "🥑": "aguacate fruta",
  "🥕": "zanahoria verdura",
  "🍅": "tomate verdura",
  "🌽": "maiz verdura",
  "🚗": "coche auto vehiculo",
  "🚙": "coche suv vehiculo",
  "🚕": "taxi transporte",
  "🏎️": "formula carreras",
  "🚌": "autobus transporte",
  "🚎": "tranvia transporte",
  "🚐": "furgoneta vehiculo",
  "🚑": "ambulancia emergencia",
  "🚒": "bomberos emergencia",
  "🛻": "camioneta pickup",
  "🏍️": "moto motocicleta",
  "🛵": "scooter moto",
  "🚲": "bicicleta bici transporte",
  "🛴": "patinete transporte",
  "✈️": "avion vuelo viaje",
  "🚂": "tren transporte",
  "🚆": "tren transporte",
  "🚇": "metro transporte",
  "🚊": "tranvia transporte",
  "🚁": "helicoptero",
  "⛽": "gasolina combustible gasolinera",
  "🅿️": "parking aparcamiento",
  "🛞": "rueda neumatico",
  "🛣️": "autopista carretera peaje",
  "⛵": "velero barco",
  "🚢": "barco crucero ferry",
  "🏥": "hospital medico salud",
  "💊": "pastilla medicina farmacia",
  "🩺": "estetoscopio medico",
  "🩹": "tirita curita",
  "🦷": "diente dentista",
  "👓": "gafas optica vista",
  "🏋️": "pesas gimnasio gym",
  "🧘": "yoga meditacion",
  "🚴": "ciclismo bicicleta deporte",
  "🏊": "natacion piscina",
  "⚽": "futbol deporte balon",
  "🏀": "baloncesto basket deporte",
  "🎾": "tenis deporte",
  "🏓": "ping pong deporte",
  "🎯": "diana objetivo",
  "🧗": "escalada deporte",
  "🤸": "gimnasia deporte",
  "🏄": "surf deporte",
  "⛷️": "esqui nieve deporte",
  "🏌️": "golf deporte",
  "📚": "libros educacion estudio",
  "🎓": "graduacion universidad",
  "✏️": "lapiz escritura",
  "📝": "nota apunte",
  "💻": "portatil ordenador laptop",
  "🖥️": "monitor ordenador pc",
  "⌨️": "teclado ordenador",
  "🖨️": "impresora oficina",
  "📱": "movil telefono smartphone",
  "📐": "regla escuadra",
  "🔬": "microscopio ciencia",
  "🧪": "laboratorio ciencia",
  "🎒": "mochila colegio",
  "📎": "clip oficina",
  "📌": "chincheta pin",
  "📋": "portapapeles lista",
  "🗂️": "carpeta archivo",
  "📂": "carpeta abierta",
  "📁": "carpeta archivo",
  "🗃️": "archivador fichero",
  "🎮": "videojuego consola gaming",
  "🎬": "cine pelicula",
  "🎭": "teatro mascara",
  "🎪": "circo espectaculo",
  "🎤": "microfono karaoke cantar",
  "🎧": "auriculares musica",
  "🎵": "musica nota",
  "🎶": "musica notas",
  "🎸": "guitarra musica",
  "🎹": "piano teclado musica",
  "📺": "television tele",
  "📻": "radio",
  "🎲": "dado juego",
  "🎳": "bolos juego",
  "🎱": "billar juego",
  "🎨": "arte pintura paleta",
  "🖌️": "pincel arte",
  "📷": "camara foto",
  "📸": "camara foto flash",
  "🎥": "camara video",
  "🎠": "tiovivo feria",
  "🎡": "noria feria",
  "🎢": "montaña rusa feria",
  "🍿": "palomitas cine",
  "🎻": "violin musica",
  "🥁": "tambor bateria musica",
  "🏖️": "playa vacaciones",
  "🏔️": "montaña nieve",
  "⛰️": "montaña",
  "🗻": "monte fuji montaña",
  "🏕️": "camping tienda",
  "🌴": "palmera tropical",
  "🌊": "ola mar playa",
  "🗼": "torre paris",
  "🗽": "estatua libertad nueva york",
  "🏰": "castillo medieval",
  "🕌": "mezquita",
  "⛪": "iglesia",
  "🛕": "templo",
  "🗿": "moai estatua",
  "🌍": "mundo europa africa",
  "🌎": "mundo america",
  "🌏": "mundo asia oceania",
  "🧳": "maleta equipaje viaje",
  "🗺️": "mapa mundo",
  "🏝️": "isla tropical",
  "🎑": "luna paisaje",
  "🌅": "amanecer sol",
  "🌄": "montaña amanecer",
  "🐶": "perro mascota",
  "🐱": "gato mascota",
  "🐭": "raton mascota",
  "🐹": "hamster mascota",
  "🐰": "conejo mascota",
  "🦊": "zorro animal",
  "🐻": "oso animal",
  "🐼": "panda animal",
  "🐨": "koala animal",
  "🐯": "tigre animal",
  "🦁": "leon animal",
  "🐸": "rana animal",
  "🐵": "mono animal",
  "🐔": "gallina pollo animal",
  "🐧": "pinguino animal",
  "🐦": "pajaro ave animal",
  "🦜": "loro ave animal",
  "🐟": "pez pescado animal",
  "🐠": "pez tropical animal",
  "🐢": "tortuga animal",
  "🐍": "serpiente animal",
  "🦎": "lagarto animal",
  "🐴": "caballo animal",
  "🦄": "unicornio animal",
  "🐝": "abeja animal",
  "🐛": "oruga bicho animal",
  "🦋": "mariposa animal",
  "👕": "camiseta ropa",
  "👔": "corbata ropa trabajo",
  "👗": "vestido ropa",
  "👠": "tacon zapato",
  "👟": "zapatilla deporte",
  "🧢": "gorra sombrero",
  "👒": "sombrero",
  "🧣": "bufanda invierno",
  "🧤": "guantes invierno",
  "🧥": "abrigo chaqueta invierno",
  "👜": "bolso complemento",
  "👝": "bolso clutch",
  "🎀": "lazo regalo",
  "💄": "pintalabios maquillaje belleza",
  "💅": "uñas manicura belleza",
  "✂️": "tijeras cortar peluqueria",
  "🪮": "peine pelo",
  "🧴": "crema locion",
  "🪥": "cepillo dientes higiene",
  "👙": "bikini playa",
  "👘": "kimono ropa",
  "🥿": "bailarina zapato",
  "🩴": "chancla sandalia",
  "👶": "bebe niño familia",
  "👧": "niña familia",
  "👦": "niño familia",
  "👩": "mujer persona",
  "👨": "hombre persona",
  "👵": "abuela familia",
  "👴": "abuelo familia",
  "👪": "familia grupo",
  "💑": "pareja amor",
  "❤️": "corazon amor",
  "💝": "corazon regalo amor",
  "🎁": "regalo cumpleaños",
  "🎉": "fiesta celebracion",
  "🎊": "confeti celebracion",
  "🎈": "globo fiesta",
  "🎄": "navidad arbol",
  "🎃": "halloween calabaza",
  "🎗️": "cinta solidaria",
  "💐": "flores ramo",
  "🌹": "rosa flor",
  "📡": "antena satelite",
  "📶": "señal wifi internet",
  "🌐": "internet web mundo",
  "📧": "email correo",
  "📮": "buzon correo postal",
  "📦": "paquete envio caja",
  "🔒": "candado seguridad",
  "🛡️": "escudo seguridad proteccion",
  "⚙️": "engranaje ajustes config",
  "🔔": "campana notificacion aviso",
  "📰": "periodico noticias",
  "🗞️": "periodico noticias prensa",
  "📄": "documento hoja papel",
  "🖊️": "boligrafo escritura",
  "✉️": "sobre carta correo",
  "🏷️": "etiqueta precio",
  "⭐": "estrella favorito",
  "🌟": "estrella brillo",
  "✨": "brillos estrellas",
  "🔥": "fuego caliente popular",
  "💧": "agua gota",
  "🌈": "arcoiris",
  "☀️": "sol clima",
  "🌙": "luna noche",
  "⚡": "rayo electricidad energia",
  "❄️": "nieve frio invierno",
  "🍀": "trebol suerte",
  "🌻": "girasol flor",
  "🌸": "flor cerezo",
  "🪻": "flor jacinto",
  "♻️": "reciclar ecologia",
  "🚨": "alarma emergencia policia",
  "🏴": "bandera negra",
  "🏳️": "bandera blanca",
};

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Dinero y compras",
    emojis: [
      "💰", "💵", "💶", "💷", "💸", "💳", "🪙", "🏦", "🧾", "💲",
      "📊", "📈", "📉", "🛒", "🛍️", "🏪", "🏬", "💎", "🎰", "🤑",
    ],
  },
  {
    label: "Hogar",
    emojis: [
      "🏠", "🏡", "🏢", "🛖", "🏗️", "🔑", "🛋️", "🛏️", "🪴", "🧹",
      "🧺", "🪣", "🔧", "🔨", "🪛", "💡", "🔌", "🚿", "🛁", "🧯",
      "🪟", "🚪", "🧊", "♨️",
    ],
  },
  {
    label: "Comida y bebida",
    emojis: [
      "🍕", "🍔", "🍟", "🌮", "🌯", "🥗", "🍣", "🍱", "🍜", "🍝",
      "🥘", "🍳", "🥐", "🍞", "🧀", "🥩", "🍖", "🥚", "🥛", "🧃",
      "☕", "🍺", "🍷", "🥤", "🍰", "🎂", "🍫", "🍩", "🍪", "🍎",
      "🍌", "🥑", "🥕", "🍅", "🌽", "🛒",
    ],
  },
  {
    label: "Transporte",
    emojis: [
      "🚗", "🚙", "🚕", "🏎️", "🚌", "🚎", "🚐", "🚑", "🚒", "🛻",
      "🏍️", "🛵", "🚲", "🛴", "✈️", "🚂", "🚆", "🚇", "🚊", "🚁",
      "⛽", "🅿️", "🛞", "🛣️", "⛵", "🚢",
    ],
  },
  {
    label: "Salud y deporte",
    emojis: [
      "🏥", "💊", "🩺", "🩹", "🦷", "👓", "🏋️", "🧘", "🚴", "🏊",
      "⚽", "🏀", "🎾", "🏓", "🎯", "🧗", "🤸", "🏄", "⛷️", "🏌️",
    ],
  },
  {
    label: "Educación y trabajo",
    emojis: [
      "📚", "🎓", "✏️", "📝", "💻", "🖥️", "⌨️", "🖨️", "📱", "📐",
      "🔬", "🧪", "🎒", "📎", "📌", "📋", "🗂️", "📂", "📁", "🗃️",
    ],
  },
  {
    label: "Ocio y entretenimiento",
    emojis: [
      "🎮", "🎬", "🎭", "🎪", "🎤", "🎧", "🎵", "🎶", "🎸", "🎹",
      "📺", "📻", "🎲", "🎳", "🎱", "🎨", "🖌️", "📷", "📸", "🎥",
      "🎠", "🎡", "🎢", "🍿", "🎻", "🥁",
    ],
  },
  {
    label: "Viajes y vacaciones",
    emojis: [
      "🏖️", "🏔️", "⛰️", "🗻", "🏕️", "🌴", "🌊", "🗼", "🗽", "🏰",
      "🕌", "⛪", "🛕", "🗿", "🌍", "🌎", "🌏", "🧳", "🗺️", "🏝️",
      "🎑", "🌅", "🌄",
    ],
  },
  {
    label: "Mascotas y animales",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
      "🦁", "🐸", "🐵", "🐔", "🐧", "🐦", "🦜", "🐟", "🐠", "🐢",
      "🐍", "🦎", "🐴", "🦄", "🐝", "🐛", "🦋",
    ],
  },
  {
    label: "Ropa y belleza",
    emojis: [
      "👕", "👔", "👗", "👠", "👟", "🧢", "👒", "🧣", "🧤", "🧥",
      "👜", "👝", "🎀", "💄", "💅", "✂️", "🪮", "🧴", "🪥", "👙",
      "👘", "🥿", "🩴",
    ],
  },
  {
    label: "Personas y familia",
    emojis: [
      "👶", "👧", "👦", "👩", "👨", "👵", "👴", "👪", "💑", "❤️",
      "💝", "🎁", "🎉", "🎊", "🎈", "🎄", "🎃", "🎗️", "💐", "🌹",
    ],
  },
  {
    label: "Servicios y suscripciones",
    emojis: [
      "📡", "📶", "🌐", "📧", "📮", "📦", "🔒", "🛡️", "⚙️", "🔔",
      "📰", "🗞️", "📄", "🖊️", "✉️", "🏷️",
    ],
  },
  {
    label: "Otros",
    emojis: [
      "⭐", "🌟", "✨", "🔥", "💧", "🌈", "☀️", "🌙", "⚡", "❄️",
      "🍀", "🌻", "🌸", "🪻", "♻️", "🚨", "📌", "🏴", "🏳️", "📦",
    ],
  },
];

type Props = {
  value?: string;
  onChange: (emoji: string) => void;
};

export function EmojiPicker({ value, onChange }: Props) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return EMOJI_GROUPS;
    const q = search.toLowerCase();
    const results: typeof EMOJI_GROUPS = [];
    for (const group of EMOJI_GROUPS) {
      const groupMatches = group.label.toLowerCase().includes(q);
      if (groupMatches) {
        results.push(group);
      } else {
        const matchingEmojis = group.emojis.filter((emoji) => {
          const kw = EMOJI_KEYWORDS[emoji];
          return kw?.toLowerCase().includes(q);
        });
        if (matchingEmojis.length > 0) {
          results.push({ label: group.label, emojis: matchingEmojis });
        }
      }
    }
    return results;
  }, [search]);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors hover:bg-muted/40 cursor-pointer"
      >
        {value ? (
          <span className="text-lg">{value}</span>
        ) : (
          <span className="text-muted-foreground">Elegir emoji</span>
        )}
      </button>
    );
  }

  return (
    <div className="rounded-md border border-input bg-background shadow-xs">
      <div className="border-b border-border/50 p-2">
        <Input
          placeholder="Buscar emoji..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 text-sm"
          autoFocus
        />
      </div>
      <div className="max-h-64 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">
            Sin resultados para &ldquo;{search}&rdquo;
          </p>
        ) : (
          filtered.map((group) => (
            <div key={group.label} className="mb-3 last:mb-0">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1">
                {group.emojis.map((emoji, i) => (
                  <button
                    key={`${emoji}-${i}`}
                    type="button"
                    onClick={() => {
                      onChange(emoji);
                      setExpanded(false);
                      setSearch("");
                    }}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-colors hover:bg-muted cursor-pointer ${
                      value === emoji ? "bg-primary/15 ring-1 ring-primary/40" : ""
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
