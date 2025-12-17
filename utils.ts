import { RawStudentRow, Student, Course, Network, CourseResult, ProcessingSummary } from './types';
import Papa from 'papaparse';

type GradeResult = { value: number; warning?: string; isBlank?: boolean };

// Parsing Helper with Validation
// Notas em branco retornam value: 0 com isBlank: true para serem ignoradas no cálculo
const parseGrade = (val: string): GradeResult => {
  if (!val || val.trim() === '') return { value: 0, isBlank: true };

  const clean = val.replace(/"/g, '').replace(',', '.').trim();

  if (clean === '') return { value: 0, isBlank: true };

  let num = parseFloat(clean);

  if (isNaN(num)) return { value: 0, isBlank: true };

  if (num > 10) {
    if (num <= 100) {
      return { value: num / 10, warning: `Nota ${num} ajustada para ${num / 10}` };
    }
    return { value: 0, warning: `Nota ${num} ignorada (>100)`, isBlank: true };
  }

  return { value: num };
};

const parseDate = (dateStr: string): Date => {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  return new Date();
};

const normalizeText = (str: string): string => {
  return str
    ? str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim()
    : "";
};

const normalizeKey = (value: string): string => {
  return normalizeText(value).replace(/[^A-Z0-9]/g, '');
};

const findColumnKey = (row: RawStudentRow, targets: string[]): string | undefined => {
  const normalizedTargets = targets.map(normalizeKey);
  return Object.keys(row).find((key) => normalizedTargets.includes(normalizeKey(key)));
};

const getValue = (row: RawStudentRow, targets: string[], fallback = ""): string => {
  const key = findColumnKey(row, targets);
  return key ? row[key] : fallback;
};

const resolveCourse = (raw: string): Course => {
  const normalized = normalizeText(raw);
  const match = (Object.values(Course) as string[]).find(
    (course) => normalizeText(course) === normalized
  );
  return (match as Course) ?? (raw as Course);
};

const SUBJECTS = [
  "PORTUGUÊS",
  "MATEMÁTICA",
  "HISTÓRIA",
  "GEOGRAFIA",
  "CIÊNCIAS",
  "ARTE",
  "ENSINO RELIGIOSO",
  "INGLÊS",
  "EDUCAÇÃO FÍSICA"
];

const getGradeValue = (row: RawStudentRow, subject: string, suffix: string): GradeResult => {
  const gradeStr = getValue(row, [`${subject} - ${suffix}`]);
  return parseGrade(gradeStr);
};

export const processCSV = (csvText: string): ProcessingSummary => {
  const result = Papa.parse<RawStudentRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  // Filtra linhas vazias ou sem dados essenciais (nome E inscrição obrigatórios)
  const validRows = result.data.filter((row) => {
    const nameRaw = getValue(row, ["NOME COMPLETO"]);
    const regRaw = getValue(row, ["NÚMERO DE INSCRIÇÃO", "NUMERO DE INSCRICAO"]);
    return Boolean((nameRaw && nameRaw.trim()) && (regRaw && regRaw.trim()));
  });

  const students: Student[] = validRows.map((row, index) => {
    const warnings: string[] = [];

    const registrationRaw = getValue(row, ["NÚMERO DE INSCRIÇÃO", "NUMERO DE INSCRICAO"]);
    const cleanedRegistration = registrationRaw ? registrationRaw.toString().replace(/"/g, '').trim() : "";
    const registrationNumber = cleanedRegistration || String(index + 1);
    if (!cleanedRegistration) {
      warnings.push('Número de inscrição ausente; gerado automaticamente.');
    }

    const nameRaw = getValue(row, ["NOME COMPLETO"]);
    const courseRaw = getValue(row, ["OPÇÃO DE CURSO", "OPCAO DE CURSO", "OPÇAO DE CURSO"]);
    const course = resolveCourse(courseRaw);

    const schoolRaw = normalizeText(getValue(row, ["ESCOLA DE ORIGEM"]));
    const network = schoolRaw.includes("PRIVADA") ? Network.PRIVATE : Network.PUBLIC;

    const neighborhoodRaw = getValue(row, ["BAIRRO"]);
    const neighborhoodNormalized = normalizeText(neighborhoodRaw);
    const isLocal = neighborhoodNormalized.includes("CENTRO");

    const quotaRaw = getValue(row, ["COTA DE ESCOLHA"]);
    const quotaNormalized = normalizeText(quotaRaw);
    const isPCD = quotaNormalized.includes("DEFICIENCIA") || quotaNormalized.includes("PCD");

    // 2. Grade Calculation - Ignora notas em branco
    let sum6 = 0, sum7 = 0, sum8 = 0;
    let count6 = 0, count7 = 0, count8 = 0;
    let sumPort = 0, countPort = 0;
    let sumMat = 0, countMat = 0;

    SUBJECTS.forEach(sub => {
      const r6 = getGradeValue(row, sub, "6º ANO");
      const r7 = getGradeValue(row, sub, "7º ANO");
      const r8 = getGradeValue(row, sub, "8º ANO");

      if (r6.warning) warnings.push(`${sub} 6º: ${r6.warning}`);
      if (r7.warning) warnings.push(`${sub} 7º: ${r7.warning}`);
      if (r8.warning) warnings.push(`${sub} 8º: ${r8.warning}`);

      // Só soma se não for nota em branco
      if (!r6.isBlank) { sum6 += r6.value; count6++; }
      if (!r7.isBlank) { sum7 += r7.value; count7++; }
      if (!r8.isBlank) { sum8 += r8.value; count8++; }

      if (sub === "PORTUGUÊS") {
        if (!r6.isBlank) { sumPort += r6.value; countPort++; }
        if (!r7.isBlank) { sumPort += r7.value; countPort++; }
        if (!r8.isBlank) { sumPort += r8.value; countPort++; }
      }
      if (sub === "MATEMÁTICA") {
        if (!r6.isBlank) { sumMat += r6.value; countMat++; }
        if (!r7.isBlank) { sumMat += r7.value; countMat++; }
        if (!r8.isBlank) { sumMat += r8.value; countMat++; }
      }
    });

    // 9th Grade is Bimesters 1, 2, 3
    let sum9 = 0;
    let count9 = 0;
    SUBJECTS.forEach(sub => {
      const b1 = getGradeValue(row, sub, "1º BIMESTRE");
      const b2 = getGradeValue(row, sub, "2º BIMESTRE");
      const b3 = getGradeValue(row, sub, "3º BIMESTRE");

      if (b1.warning) warnings.push(`${sub} 9º-B1: ${b1.warning}`);
      if (b2.warning) warnings.push(`${sub} 9º-B2: ${b2.warning}`);
      if (b3.warning) warnings.push(`${sub} 9º-B3: ${b3.warning}`);

      // Calcula média do 9º ano para esta matéria (somente bimestres preenchidos)
      const bimestres = [b1, b2, b3].filter(b => !b.isBlank);
      if (bimestres.length > 0) {
        const avgSub9 = bimestres.reduce((acc, b) => acc + b.value, 0) / bimestres.length;
        sum9 += avgSub9;
        count9++;

        // Para Português e Matemática, soma cada bimestre individualmente
        if (sub === "PORTUGUÊS") {
          bimestres.forEach(b => { sumPort += b.value; countPort++; });
        }
        if (sub === "MATEMÁTICA") {
          bimestres.forEach(b => { sumMat += b.value; countMat++; });
        }
      }
    });

    // Calcula médias por ano (dividindo apenas pelo número de notas preenchidas)
    const avg6th = count6 > 0 ? sum6 / count6 : 0;
    const avg7th = count7 > 0 ? sum7 / count7 : 0;
    const avg8th = count8 > 0 ? sum8 / count8 : 0;
    const avg9th = count9 > 0 ? sum9 / count9 : 0;

    // Calcula nota final (média dos anos que têm notas)
    const anosComNota = [
      { avg: avg6th, hasGrades: count6 > 0 },
      { avg: avg7th, hasGrades: count7 > 0 },
      { avg: avg8th, hasGrades: count8 > 0 },
      { avg: avg9th, hasGrades: count9 > 0 },
    ].filter(a => a.hasGrades);

    const finalScore = anosComNota.length > 0
      ? anosComNota.reduce((acc, a) => acc + a.avg, 0) / anosComNota.length
      : 0;

    const avgPort = countPort > 0 ? sumPort / countPort : 0;
    const avgMat = countMat > 0 ? sumMat / countMat : 0;

    return {
      id: `${index}-${nameRaw}`,
      registrationNumber,
      timestamp: getValue(row, ["Carimbo de data/hora"]),
      name: nameRaw.toUpperCase(),
      birthDate: parseDate(getValue(row, ["DATA DE NASCIMENTO"])),
      course,
      municipality: getValue(row, ["MUNICÍPIO", "MUNICIPIO"]),
      neighborhood: neighborhoodRaw,
      schoolNetwork: network,
      claimedQuota: quotaRaw,
      isPCD,
      isLocal,
      avg6th,
      avg7th,
      avg8th,
      avg9th,
      avgPort,
      avgMat,
      finalScore,
      warnings,
      rank: 0
    };
  });

  // Organize by Course
  const results: CourseResult[] = Object.values(Course).map(course => {
    return processCourse(course, students.filter(s => s.course === course));
  });

  return {
    totalProcessed: students.length,
    results
  };
};

const processCourse = (course: Course, candidates: Student[]): CourseResult => {
  // ========================================
  // FASE 1: PREPARAÇÃO
  // ========================================

  // Ordenar todos por nota (critérios de desempate: idade, português, matemática)
  const sorted = [...candidates].sort((a, b) => {
    if (Math.abs(b.finalScore - a.finalScore) > 0.0001) return b.finalScore - a.finalScore;
    if (a.birthDate.getTime() !== b.birthDate.getTime()) {
      return a.birthDate.getTime() - b.birthDate.getTime(); // mais velho primeiro
    }
    if (Math.abs(b.avgPort - a.avgPort) > 0.0001) return b.avgPort - a.avgPort;
    return b.avgMat - a.avgMat;
  });

  // Determinar elegibilidades para cada candidato (Art. 7º, § 1º - Lei 15.142/2025)
  sorted.forEach(student => {
    const eligibilities: ('PCD' | 'PUBLICA_CENTRO' | 'PUBLICA_AMPLA' | 'PRIVADA_CENTRO' | 'PRIVADA_AMPLA')[] = [];

    if (student.schoolNetwork === Network.PUBLIC) {
      eligibilities.push('PUBLICA_AMPLA');
      if (student.isLocal) {
        eligibilities.push('PUBLICA_CENTRO');
      }
    } else {
      eligibilities.push('PRIVADA_AMPLA');
      if (student.isLocal) {
        eligibilities.push('PRIVADA_CENTRO');
      }
    }

    if (student.isPCD) {
      eligibilities.push('PCD');
    }

    student.eligibilities = eligibilities;
  });

  // Capacidades do Anexo I (turmas de 45 vagas)
  const vacancies = {
    pcd: 2,
    publicaCentro: 10,
    publicaAmpla: 24,
    privadaCentro: 3,
    privadaAmpla: 6
  };

  // Estruturas de resultado
  const selectedPCD: Student[] = [];
  const selectedPubLocal: Student[] = [];
  const selectedPubBroad: Student[] = [];
  const selectedPrivLocal: Student[] = [];
  const selectedPrivBroad: Student[] = [];

  const selectedIds = new Set<string>();

  // Helper para alocar candidato
  const allocate = (student: Student, category: string, list: Student[]) => {
    student.status = 'SELECTED';
    student.selectedCategory = category;
    student.allocatedIn = category;
    student.rank = list.length + 1;
    list.push(student);
    selectedIds.add(student.id);
  };

  // ========================================
  // FASE 2: ALOCAÇÃO NA COTA PCD (PRIORIDADE MÁXIMA)
  // ========================================
  // Candidatos PCD tentam primeiro a cota PCD

  for (const student of sorted) {
    if (selectedIds.has(student.id)) continue;

    if (student.isPCD && vacancies.pcd > 0) {
      allocate(student, 'PCD', selectedPCD);
      vacancies.pcd--;
    }
  }

  // ========================================
  // FASE 3: ALOCAÇÃO NAS COTAS REGIONAIS (CENTRO)
  // ========================================
  // Candidatos do Centro tentam a cota regional da sua rede

  for (const student of sorted) {
    if (selectedIds.has(student.id)) continue;

    if (student.isLocal) {
      if (student.schoolNetwork === Network.PUBLIC && vacancies.publicaCentro > 0) {
        allocate(student, 'PÚBLICA - REGIÃO', selectedPubLocal);
        vacancies.publicaCentro--;
      } else if (student.schoolNetwork === Network.PRIVATE && vacancies.privadaCentro > 0) {
        allocate(student, 'PRIVADA - REGIÃO', selectedPrivLocal);
        vacancies.privadaCentro--;
      }
    }
  }

  // ========================================
  // FASE 4: ALOCAÇÃO NA AMPLA CONCORRÊNCIA
  // ========================================
  // Quem não foi alocado nas cotas tenta a ampla da sua rede

  for (const student of sorted) {
    if (selectedIds.has(student.id)) continue;

    if (student.schoolNetwork === Network.PUBLIC && vacancies.publicaAmpla > 0) {
      allocate(student, 'PÚBLICA - AMPLA', selectedPubBroad);
      vacancies.publicaAmpla--;
    } else if (student.schoolNetwork === Network.PRIVATE && vacancies.privadaAmpla > 0) {
      allocate(student, 'PRIVADA - AMPLA', selectedPrivBroad);
      vacancies.privadaAmpla--;
    }
  }

  // ========================================
  // FASE 5: REALOCAÇÃO DE VAGAS NÃO PREENCHIDAS
  // ========================================
  // Art. 8º: Vagas de cota não preenchidas são revertidas

  // PCD não preenchida → Pública Ampla
  vacancies.publicaAmpla += vacancies.pcd;
  const leftoverPCD = vacancies.pcd;
  vacancies.pcd = 0;

  // Centro não preenchida → Ampla da mesma rede
  const leftoverPubCentro = vacancies.publicaCentro;
  vacancies.publicaAmpla += vacancies.publicaCentro;
  vacancies.publicaCentro = 0;

  const leftoverPrivCentro = vacancies.privadaCentro;
  vacancies.privadaAmpla += vacancies.privadaCentro;
  vacancies.privadaCentro = 0;

  // Privada não preenchida → Pública Ampla
  const leftoverPrivAmpla = vacancies.privadaAmpla;
  vacancies.publicaAmpla += vacancies.privadaAmpla;
  vacancies.privadaAmpla = 0;

  // ========================================
  // FASE 6: PREENCHER VAGAS REALOCADAS
  // ========================================

  for (const student of sorted) {
    if (selectedIds.has(student.id)) continue;

    if (student.schoolNetwork === Network.PUBLIC && vacancies.publicaAmpla > 0) {
      allocate(student, 'PÚBLICA - AMPLA (REMANEJO)', selectedPubBroad);
      vacancies.publicaAmpla--;
    }
  }

  // ========================================
  // FASE 7: CLASSIFICÁVEIS (LISTA DE ESPERA)
  // ========================================
  // Art. 7º, § 1º: Candidatos aparecem em TODAS as listas para as quais são elegíveis

  const waitingPCD: Student[] = [];
  const waitingPublicLocal: Student[] = [];
  const waitingPublicBroad: Student[] = [];
  const waitingPrivateLocal: Student[] = [];
  const waitingPrivateBroad: Student[] = [];

  const unallocated = sorted.filter(s => !selectedIds.has(s.id));

  // Contadores de rank por lista
  let rankPCD = 0;
  let rankPubLocal = 0;
  let rankPubBroad = 0;
  let rankPrivLocal = 0;
  let rankPrivBroad = 0;

  for (const student of unallocated) {
    student.status = 'WAITING';

    // Adiciona em TODAS as listas para as quais é elegível (concorrência simultânea)
    if (student.schoolNetwork === Network.PUBLIC) {
      // Sempre na ampla da rede
      rankPubBroad++;
      const copyBroad = { ...student, rank: rankPubBroad };
      waitingPublicBroad.push(copyBroad);

      // Se mora no Centro, também na regional
      if (student.isLocal) {
        rankPubLocal++;
        const copyLocal = { ...student, rank: rankPubLocal };
        waitingPublicLocal.push(copyLocal);
      }
    }

    if (student.schoolNetwork === Network.PRIVATE) {
      rankPrivBroad++;
      const copyBroad = { ...student, rank: rankPrivBroad };
      waitingPrivateBroad.push(copyBroad);

      if (student.isLocal) {
        rankPrivLocal++;
        const copyLocal = { ...student, rank: rankPrivLocal };
        waitingPrivateLocal.push(copyLocal);
      }
    }

    // PCD entra na lista PCD independente da rede
    if (student.isPCD) {
      rankPCD++;
      const copyPCD = { ...student, rank: rankPCD };
      waitingPCD.push(copyPCD);
    }
  }

  // ========================================
  // RETORNO
  // ========================================

  return {
    course,
    pcd: selectedPCD,
    publicLocal: selectedPubLocal,
    publicBroad: selectedPubBroad,
    privateLocal: selectedPrivLocal,
    privateBroad: selectedPrivBroad,
    waitingPCD,
    waitingPublicLocal,
    waitingPublicBroad,
    waitingPrivateLocal,
    waitingPrivateBroad
  };
};

