import React, { useMemo } from 'react';
import { Award, AlertTriangle, BarChart3, MapPin, Users } from 'lucide-react';
import { Network, ProcessingSummary, CourseResult, Student } from '../types';

interface GeneralStatsProps {
  data: ProcessingSummary;
}

const SEATS_PER_COURSE = 45;

const formatScore = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatPercent = (ratio: number) =>
  `${(ratio * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const cssPercent = (ratio: number) => `${Math.max(0, Math.min(100, ratio * 100))}%`;

const safeRatio = (num: number, den: number) => (den > 0 ? num / den : 0);

const quantile = (sorted: number[], q: number): number | null => {
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const baseValue = sorted[base] ?? null;
  const nextValue = sorted[base + 1];
  if (baseValue === null) return null;
  if (typeof nextValue !== 'number') return baseValue;
  return baseValue + rest * (nextValue - baseValue);
};

const flattenCourse = (result: CourseResult) => {
  const selected = [
    ...result.pcd,
    ...result.publicLocal,
    ...result.publicBroad,
    ...result.privateLocal,
    ...result.privateBroad,
  ];
  const waiting = [
    ...result.waitingPCD,
    ...result.waitingPublicLocal,
    ...result.waitingPublicBroad,
    ...result.waitingPrivateLocal,
    ...result.waitingPrivateBroad,
  ];
  return { selected, waiting, all: [...selected, ...waiting] };
};

const cutoffScore = (students: Student[]): number | null => {
  if (students.length === 0) return null;
  const last = students[students.length - 1];
  return typeof last.finalScore === 'number' ? last.finalScore : null;
};

export const GeneralStats: React.FC<GeneralStatsProps> = ({ data }) => {
  const computed = useMemo(() => {
    const flattened = data.results.map((r) => ({
      course: r.course,
      ...flattenCourse(r),
      raw: r,
    }));

    const allStudents = flattened.flatMap((r) => r.all);
    const selectedStudents = flattened.flatMap((r) => r.selected);
    const waitingStudents = flattened.flatMap((r) => r.waiting);

    const total = allStudents.length;

    const publicCount = allStudents.filter((s) => s.schoolNetwork === Network.PUBLIC).length;
    const privateCount = allStudents.filter((s) => s.schoolNetwork === Network.PRIVATE).length;
    const pcdCount = allStudents.filter((s) => s.isPCD).length;
    const localCount = allStudents.filter((s) => s.isLocal).length;

    const selectedPublic = selectedStudents.filter((s) => s.schoolNetwork === Network.PUBLIC).length;
    const selectedPrivate = selectedStudents.filter((s) => s.schoolNetwork === Network.PRIVATE).length;
    const selectedPCD = selectedStudents.filter((s) => s.isPCD).length;
    const selectedLocal = selectedStudents.filter((s) => s.isLocal).length;

    const studentsWithWarnings = allStudents.filter((s) => (s.warnings?.length ?? 0) > 0).length;
    const totalWarnings = allStudents.reduce((acc, s) => acc + (s.warnings?.length ?? 0), 0);
    const missingRegistration = allStudents.filter((s) =>
      (s.warnings ?? []).some((w) => w.toLowerCase().includes('número de inscrição ausente'))
    ).length;
    const adjustedGrades = allStudents.filter((s) =>
      (s.warnings ?? []).some((w) => w.toLowerCase().includes('ajustada'))
    ).length;
    const ignoredGrades = allStudents.filter((s) =>
      (s.warnings ?? []).some((w) => w.toLowerCase().includes('ignorada'))
    ).length;

    const registrationCounts = new Map<string, number>();
    allStudents.forEach((s) => {
      const key = (s.registrationNumber ?? '').trim();
      if (!key) return;
      registrationCounts.set(key, (registrationCounts.get(key) ?? 0) + 1);
    });
    const duplicatedRegistrationNumbers = [...registrationCounts.entries()].filter(([, c]) => c > 1);
    const duplicatedRegistrationKeys = duplicatedRegistrationNumbers.length;
    const duplicatedRegistrationRows = duplicatedRegistrationNumbers.reduce((acc, [, c]) => acc + c, 0);

    const scores = allStudents
      .map((s) => s.finalScore)
      .filter((n) => typeof n === 'number' && Number.isFinite(n))
      .sort((a, b) => a - b);
    const mean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const median = quantile(scores, 0.5);
    const p25 = quantile(scores, 0.25);
    const p75 = quantile(scores, 0.75);
    const min = scores.length ? scores[0] : null;
    const max = scores.length ? scores[scores.length - 1] : null;

    const bins = [
      { label: '0–4', from: 0, to: 4 },
      { label: '4–6', from: 4, to: 6 },
      { label: '6–7', from: 6, to: 7 },
      { label: '7–8', from: 7, to: 8 },
      { label: '8–9', from: 8, to: 9 },
      { label: '9–10', from: 9, to: 10.00001 },
    ];
    const histogram = bins.map((b) => {
      const count = scores.filter((s) => s >= b.from && s < b.to).length;
      return { ...b, count };
    });
    const maxBin = Math.max(...histogram.map((h) => h.count), 1);

    const courseRows = flattened.map((r) => {
      const totalCourse = r.all.length;
      const selectedCourse = r.selected.length;
      const waitingCourse = r.waiting.length;
      return {
        course: r.course,
        total: totalCourse,
        selected: selectedCourse,
        waiting: waitingCourse,
        applicantsPerSeat: safeRatio(totalCourse, SEATS_PER_COURSE),
        cutoffs: {
          pcd: cutoffScore(r.raw.pcd),
          publicLocal: cutoffScore(r.raw.publicLocal),
          publicBroad: cutoffScore(r.raw.publicBroad),
          privateLocal: cutoffScore(r.raw.privateLocal),
          privateBroad: cutoffScore(r.raw.privateBroad),
        },
        counts: {
          pcd: r.raw.pcd.length,
          publicLocal: r.raw.publicLocal.length,
          publicBroad: r.raw.publicBroad.length,
          privateLocal: r.raw.privateLocal.length,
          privateBroad: r.raw.privateBroad.length,
        },
      };
    });

    return {
      total,
      selected: selectedStudents.length,
      waiting: waitingStudents.length,
      publicCount,
      privateCount,
      pcdCount,
      localCount,
      selectedPublic,
      selectedPrivate,
      selectedPCD,
      selectedLocal,
      studentsWithWarnings,
      totalWarnings,
      missingRegistration,
      adjustedGrades,
      ignoredGrades,
      duplicatedRegistrationKeys,
      duplicatedRegistrationRows,
      scores: {
        mean,
        median,
        p25,
        p75,
        min,
        max,
      },
      histogram,
      maxBin,
      courseRows,
    };
  }, [data]);

  const scoreOrDash = (value: number | null) => (value === null ? '—' : formatScore(value));

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              Visão Geral
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Resumo geral do arquivo processado (sem detalhes individuais).
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">Inscritos</div>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{computed.total}</div>
          <div className="text-xs text-gray-500 mt-1">candidatos processados</div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">Classificados</div>
            <Award className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-700 mt-2">{computed.selected}</div>
          <div className="text-xs text-gray-500 mt-1">
            {formatPercent(safeRatio(computed.selected, computed.total))} do total
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">Classificáveis</div>
            <Users className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-orange-600 mt-2">{computed.waiting}</div>
          <div className="text-xs text-gray-500 mt-1">
            {formatPercent(safeRatio(computed.waiting, computed.total))} do total
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">Avisos</div>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-amber-600 mt-2">{computed.studentsWithWarnings}</div>
          <div className="text-xs text-gray-500 mt-1">
            {computed.totalWarnings} avisos no total
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Composition */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            Composição (Inscritos)
          </h3>
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Rede Pública</span>
                <span className="font-medium">
                  {computed.publicCount} ({formatPercent(safeRatio(computed.publicCount, computed.total))})
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: cssPercent(safeRatio(computed.publicCount, computed.total)) }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Rede Privada</span>
                <span className="font-medium">
                  {computed.privateCount} ({formatPercent(safeRatio(computed.privateCount, computed.total))})
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded mt-2 overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{ width: cssPercent(safeRatio(computed.privateCount, computed.total)) }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>PCD (declarado)</span>
                <span className="font-medium">
                  {computed.pcdCount} ({formatPercent(safeRatio(computed.pcdCount, computed.total))})
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded mt-2 overflow-hidden">
                <div
                  className="h-full bg-teal-500"
                  style={{ width: cssPercent(safeRatio(computed.pcdCount, computed.total)) }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  Centro (bairro)
                </span>
                <span className="font-medium">
                  {computed.localCount} ({formatPercent(safeRatio(computed.localCount, computed.total))})
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded mt-2 overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: cssPercent(safeRatio(computed.localCount, computed.total)) }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="text-sm font-semibold text-gray-700">Composição (Classificados)</div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm text-gray-600">
              <div className="bg-gray-50 rounded p-3 border">
                <div className="text-xs text-gray-500">Rede Pública</div>
                <div className="font-bold text-blue-700">
                  {computed.selectedPublic} ({formatPercent(safeRatio(computed.selectedPublic, computed.selected))})
                </div>
              </div>
              <div className="bg-gray-50 rounded p-3 border">
                <div className="text-xs text-gray-500">Rede Privada</div>
                <div className="font-bold text-purple-700">
                  {computed.selectedPrivate} ({formatPercent(safeRatio(computed.selectedPrivate, computed.selected))})
                </div>
              </div>
              <div className="bg-gray-50 rounded p-3 border">
                <div className="text-xs text-gray-500">PCD</div>
                <div className="font-bold text-teal-700">
                  {computed.selectedPCD} ({formatPercent(safeRatio(computed.selectedPCD, computed.selected))})
                </div>
              </div>
              <div className="bg-gray-50 rounded p-3 border">
                <div className="text-xs text-gray-500">Centro</div>
                <div className="font-bold text-green-700">
                  {computed.selectedLocal} ({formatPercent(safeRatio(computed.selectedLocal, computed.selected))})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scores */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-500" />
            Notas (Final)
          </h3>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-50 rounded p-4 border">
              <div className="text-xs text-gray-500">Média</div>
              <div className="text-xl font-bold text-gray-900">
                {computed.scores.mean === null ? '—' : formatScore(computed.scores.mean)}
              </div>
            </div>
            <div className="bg-gray-50 rounded p-4 border">
              <div className="text-xs text-gray-500">Mediana</div>
              <div className="text-xl font-bold text-gray-900">{scoreOrDash(computed.scores.median)}</div>
            </div>
            <div className="bg-gray-50 rounded p-4 border">
              <div className="text-xs text-gray-500">P25 / P75</div>
              <div className="text-sm font-bold text-gray-900">
                {scoreOrDash(computed.scores.p25)} / {scoreOrDash(computed.scores.p75)}
              </div>
            </div>
            <div className="bg-gray-50 rounded p-4 border">
              <div className="text-xs text-gray-500">Min / Máx</div>
              <div className="text-sm font-bold text-gray-900">
                {scoreOrDash(computed.scores.min)} / {scoreOrDash(computed.scores.max)}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-sm font-semibold text-gray-700 mb-3">Distribuição (faixas)</div>
            <div className="space-y-2">
              {computed.histogram.map((h) => {
                const width = `${Math.round((h.count / computed.maxBin) * 100)}%`;
                return (
                  <div key={h.label} className="flex items-center gap-3">
                    <div className="w-14 text-xs text-gray-500">{h.label}</div>
                    <div className="flex-1 h-2 bg-gray-100 rounded overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width }} />
                    </div>
                    <div className="w-16 text-right text-xs text-gray-600 font-medium">{h.count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Courses */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-bold text-gray-800">Inscritos por curso</h3>
          <p className="text-xs text-gray-500 mt-1">Inclui classificados e classificáveis.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-500 bg-white">
              <tr>
                <th className="px-6 py-3 text-left">Curso</th>
                <th className="px-6 py-3 text-right">Inscritos</th>
                <th className="px-6 py-3 text-right">Classificados</th>
                <th className="px-6 py-3 text-right">Classificáveis</th>
                <th className="px-6 py-3 text-right">Inscritos/Vaga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {computed.courseRows.map((r) => (
                <tr key={r.course} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{r.course}</td>
                  <td className="px-6 py-3 text-right text-gray-700">{r.total}</td>
                  <td className="px-6 py-3 text-right text-green-700 font-semibold">{r.selected}</td>
                  <td className="px-6 py-3 text-right text-orange-700 font-semibold">{r.waiting}</td>
                  <td className="px-6 py-3 text-right text-gray-700">
                    {r.applicantsPerSeat.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cutoffs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-bold text-gray-800">Notas de corte (último classificado)</h3>
          <p className="text-xs text-gray-500 mt-1">Por curso e lista de classificação.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-500 bg-white">
              <tr>
                <th className="px-6 py-3 text-left">Curso</th>
                <th className="px-6 py-3 text-center">PCD</th>
                <th className="px-6 py-3 text-center">Pública (Centro)</th>
                <th className="px-6 py-3 text-center">Pública (Ampla)</th>
                <th className="px-6 py-3 text-center">Privada (Centro)</th>
                <th className="px-6 py-3 text-center">Privada (Ampla)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {computed.courseRows.map((r) => (
                <tr key={r.course} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{r.course}</td>
                  <td className="px-6 py-3 text-center text-gray-700">
                    {scoreOrDash(r.cutoffs.pcd)}
                    <span className="text-xs text-gray-400 ml-1">({r.counts.pcd})</span>
                  </td>
                  <td className="px-6 py-3 text-center text-gray-700">
                    {scoreOrDash(r.cutoffs.publicLocal)}
                    <span className="text-xs text-gray-400 ml-1">({r.counts.publicLocal})</span>
                  </td>
                  <td className="px-6 py-3 text-center text-gray-700">
                    {scoreOrDash(r.cutoffs.publicBroad)}
                    <span className="text-xs text-gray-400 ml-1">({r.counts.publicBroad})</span>
                  </td>
                  <td className="px-6 py-3 text-center text-gray-700">
                    {scoreOrDash(r.cutoffs.privateLocal)}
                    <span className="text-xs text-gray-400 ml-1">({r.counts.privateLocal})</span>
                  </td>
                  <td className="px-6 py-3 text-center text-gray-700">
                    {scoreOrDash(r.cutoffs.privateBroad)}
                    <span className="text-xs text-gray-400 ml-1">({r.counts.privateBroad})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Quality */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Qualidade do arquivo
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="bg-gray-50 border rounded p-4">
            <div className="text-xs text-gray-500">Inscrição ausente</div>
            <div className="text-lg font-bold text-gray-900">{computed.missingRegistration}</div>
          </div>
          <div className="bg-gray-50 border rounded p-4">
            <div className="text-xs text-gray-500">Notas ajustadas</div>
            <div className="text-lg font-bold text-gray-900">{computed.adjustedGrades}</div>
          </div>
          <div className="bg-gray-50 border rounded p-4">
            <div className="text-xs text-gray-500">Notas ignoradas</div>
            <div className="text-lg font-bold text-gray-900">{computed.ignoredGrades}</div>
          </div>
          <div className="bg-gray-50 border rounded p-4">
            <div className="text-xs text-gray-500">Inscrições duplicadas</div>
            <div className="text-lg font-bold text-gray-900">{computed.duplicatedRegistrationKeys}</div>
            <div className="text-xs text-gray-500 mt-1">
              {computed.duplicatedRegistrationKeys === 0 ? '—' : `${computed.duplicatedRegistrationRows} candidatos`}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          * Duplicidade considera somente “Inscrição” repetida no arquivo.
        </p>
      </div>
    </div>
  );
};
