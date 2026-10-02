/**
 * Passkeys are stored with the browser's user-agent string as their label.
 * That is unreadable ("Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/…"), so
 * turn it into "Chrome en Android". Anything that isn't a user agent (a custom
 * name) is returned as is.
 */
const BROWSERS: [RegExp, string][] = [
  // Order matters: Edge and Samsung also say "Chrome", Chrome also says "Safari".
  [/Edg(?:e|A|iOS)?\//, "Edge"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "Mac"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

export function describeDevice(label: string | null | undefined): string {
  if (!label) return "Dispositivo";
  if (!label.startsWith("Mozilla/")) return label;
  const browser = BROWSERS.find(([pattern]) => pattern.test(label))?.[1];
  const system = SYSTEMS.find(([pattern]) => pattern.test(label))?.[1];
  if (browser && system) return `${browser} en ${system}`;
  return browser ?? system ?? "Dispositivo";
}
