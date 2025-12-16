import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Student } from '../types';

interface StudentListProps {
  students: Student[];
  title: string;
  color: string;
}

export const StudentList: React.FC<StudentListProps> = ({
  students,
  title,
  color
}) => {
  const formatScore = (value: number) =>
    value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Always render the container to show the empty state message if needed

  return (
    <div className={`mb-8 border rounded-lg overflow-hidden bg-white shadow-sm ${color}`}>
      <div className={`px-4 py-3 border-b font-bold text-gray-800 flex justify-between items-center bg-gray-50`}>
        <span>{title}</span>
        <span className="text-xs font-normal text-gray-500 bg-white px-2 py-1 rounded border">
          {students.length}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-center w-16">Pos</th>
              <th className="px-4 py-3 text-center w-20">Inscrição</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Média</th>
              <th className="px-4 py-3 text-right text-gray-400">Port</th>
              <th className="px-4 py-3 text-right text-gray-400">Mat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500 italic">
                  Não há candidatos {title.toLowerCase().includes('espera') || title.toLowerCase().includes('classificáveis') ? 'classificáveis' : 'classificados'} nesta modalidade.
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-center font-bold text-gray-500">
                    {s.rank}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500 font-mono text-xs">
                    {s.registrationNumber}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center flex-wrap gap-1">
                      {s.name}
                      {/* Badges de elegibilidade - mostra cotas para as quais era elegível mas não usou */}
                      {s.eligibilities && s.eligibilities.length > 1 && s.allocatedIn && (
                        <>
                          {s.eligibilities.includes('PCD') && !s.allocatedIn.includes('PCD') && (
                            <span className="px-1.5 py-0.5 text-[9px] bg-teal-100 text-teal-700 rounded font-medium">PCD</span>
                          )}
                          {(s.eligibilities.includes('PUBLICA_CENTRO') || s.eligibilities.includes('PRIVADA_CENTRO'))
                            && !s.allocatedIn.includes('REGIÃO') && (
                              <span className="px-1.5 py-0.5 text-[9px] bg-green-100 text-green-700 rounded font-medium">Centro</span>
                            )}
                        </>
                      )}
                      {s.warnings && s.warnings.length > 0 && (
                        <div className="group relative ml-1">
                          <AlertTriangle className="w-4 h-4 text-amber-500 cursor-help" />
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-800 text-white text-xs rounded p-2 z-10 shadow-lg">
                            <p className="font-bold mb-1">Avisos de processamento:</p>
                            <ul className="list-disc pl-3">
                              {s.warnings.map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${s.status === 'SELECTED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                      {s.status === 'SELECTED' ? 'CLASSIFICADO' : 'CLASSIFICÁVEL'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 bg-yellow-50">
                    {formatScore(s.finalScore)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">
                    {formatScore(s.avgPort)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">
                    {formatScore(s.avgMat)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
