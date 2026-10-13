import { buildPhishingTitles } from "@/lib/reports/titles";

export type ReportPersona = {
  name: string;
  email: string;
  steps: string;
};

export type ReportBatch = {
  key: string;
  personas: ReportPersona[];
  sent: number;
};

const FIRST = [
  "Ana", "Bruno", "Camila", "Diego", "Elena", "Felipe", "Gabriela", "Henrique",
  "Isabela", "João", "Karina", "Lucas", "Marina", "Nicolas", "Olivia", "Paulo",
  "Queila", "Rafael", "Sandra", "Thiago", "Ursula", "Vinícius", "Wagner", "Yasmin",
  "Amanda", "Caio", "Daniela", "Eduardo", "Fernanda", "Gustavo", "Helena", "Igor",
  "Juliana", "Leandro", "Márcia", "Natália", "Otávio", "Patrícia", "Renato", "Sabrina",
];

const LAST = [
  "Silva", "Souza", "Oliveira", "Santos", "Lima", "Pereira", "Costa", "Ferreira",
  "Rodrigues", "Almeida", "Nascimento", "Araújo", "Carvalho", "Gomes", "Martins",
  "Ribeiro", "Barbosa", "Melo", "Cardoso", "Teixeira", "Correia", "Dias", "Castro",
  "Mendes", "Rocha",
];

const PROVIDERS = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com"];

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export function builtInReportPersonas(url: string, count: number): ReportPersona[] {
  const total = Math.max(0, Math.min(FIRST.length * LAST.length, count));
  const titles = buildPhishingTitles(url, total);
  const personas: ReportPersona[] = [];
  for (let index = 0; index < total; index += 1) {
    const first = FIRST[index % FIRST.length];
    const last = LAST[Math.floor(index / FIRST.length) % LAST.length];
    const name = `${first} ${last}`;
    const email = `${slug(first)}.${slug(last)}${index}@${PROVIDERS[index % PROVIDERS.length]}`;
    personas.push({
      name,
      email,
      steps: titles[index] ?? titles[0],
    });
  }
  return personas;
}
