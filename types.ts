export enum Course {
  ADMINISTRACAO = "ADMINISTRAÇÃO",
  AGRONEGOCIO = "AGRONEGÓCIO",
  COMERCIO = "COMÉRCIO",
  REDES = "REDES DE COMPUTADORES"
}

export enum Network {
  PUBLIC = "PÚBLICA",
  PRIVATE = "PRIVADA"
}

export enum QuotaType {
  AMPLA = "AMPLA CONCORRÊNCIA",
  PCD = "PESSOA COM DEFICIÊNCIA",
  RURAL = "RURAL", // Used for residence check logic fallback
  LOCAL = "REGIÃO DA ESCOLA" // Centro
}

export interface RawStudentRow {
  "Carimbo de data/hora": string;
  "NOME COMPLETO": string;
  "NÚMERO DE INSCRIÇÃO"?: string;
  "DATA DE NASCIMENTO": string;
  "OPÇÃO DE CURSO": string;
  "MUNICÍPIO": string;
  "BAIRRO": string;
  "ESCOLA DE ORIGEM": string;
  "COTA DE ESCOLHA": string;
  [key: string]: string; // For dynamic grade columns
}

// Tipos de elegibilidade para concorrência simultânea
export type EligibilityType =
  | 'PCD'
  | 'PUBLICA_CENTRO'
  | 'PUBLICA_AMPLA'
  | 'PRIVADA_CENTRO'
  | 'PRIVADA_AMPLA';

export interface Student {
  id: string;
  registrationNumber: string; // Número de inscrição oficial da planilha
  timestamp: string;
  name: string;
  birthDate: Date;
  course: Course;
  municipality: string;
  neighborhood: string;
  schoolNetwork: Network;
  claimedQuota: string;
  isPCD: boolean;
  isLocal: boolean; // Lives in CENTRO

  // Averages
  avg6th: number;
  avg7th: number;
  avg8th: number;
  avg9th: number;

  // Tie Breakers
  avgPort: number;
  avgMat: number;

  finalScore: number;

  // Processing Status
  status?: 'SELECTED' | 'WAITING' | 'DISQUALIFIED';
  selectedCategory?: string; // 'PCD', 'PUB_LOCAL', 'PUB_AMPLA', etc.
  rank: number; // Relative rank within the specific list

  // Concorrência simultânea (Art. 7º Lei 15.142/2025)
  eligibilities?: EligibilityType[]; // Todas as categorias elegíveis
  allocatedIn?: string; // Onde foi efetivamente alocado
  benefitedFromSimultaneous?: boolean; // Ocupou vaga liberada por cotista na ampla

  // Validation
  warnings: string[];
}

export interface CourseResult {
  course: Course;
  // Selected
  pcd: Student[];
  publicLocal: Student[];
  publicBroad: Student[];
  privateLocal: Student[];
  privateBroad: Student[];

  // Waiting Lists (Classificáveis)
  waitingPCD: Student[];
  waitingPublicLocal: Student[];
  waitingPublicBroad: Student[];
  waitingPrivateLocal: Student[];
  waitingPrivateBroad: Student[];
}

export interface ProcessingSummary {
  totalProcessed: number;
  results: CourseResult[];
}
