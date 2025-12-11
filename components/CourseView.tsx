import React from 'react';
import { CourseResult } from '../types';
import { StudentList } from './StudentList';

interface CourseViewProps {
  result: CourseResult;
}

export const CourseView: React.FC<CourseViewProps> = ({ result }) => {
  const totalWaiting = 
    result.waitingPCD.length + 
    result.waitingPublicLocal.length + 
    result.waitingPublicBroad.length + 
    result.waitingPrivateLocal.length + 
    result.waitingPrivateBroad.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">PCD</div>
          <div className="text-2xl font-bold text-gray-900">{result.pcd.length} <span className="text-xs font-normal text-gray-400">/ 2 vagas</span></div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Pública (Total)</div>
          <div className="text-2xl font-bold text-blue-600">
            {result.publicLocal.length + result.publicBroad.length} <span className="text-xs font-normal text-gray-400">/ 34 vagas</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Privada (Total)</div>
          <div className="text-2xl font-bold text-purple-600">
            {result.privateLocal.length + result.privateBroad.length} <span className="text-xs font-normal text-gray-400">/ 9 vagas</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Classificáveis (Total)</div>
          <div className="text-2xl font-bold text-orange-600">{totalWaiting}</div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800 border-l-4 border-green-500 pl-3">Classificados</h2>
        
        <StudentList 
          students={result.pcd} 
          title="Cota PCD (Pessoas com Deficiência)" 
          color="border-l-4 border-l-teal-500" 
        />
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-6">
             <h3 className="font-semibold text-blue-800 bg-blue-50 p-2 rounded">Rede Pública</h3>
             <StudentList 
              students={result.publicLocal} 
              title="Cota Regional (Centro) - Pública" 
              color="border-l-4 border-l-blue-400"
            />
            <StudentList 
              students={result.publicBroad} 
              title="Ampla Concorrência - Pública" 
              color="border-l-4 border-l-blue-600"
            />
          </div>

          <div className="space-y-6">
            <h3 className="font-semibold text-purple-800 bg-purple-50 p-2 rounded">Rede Privada</h3>
             <StudentList 
              students={result.privateLocal} 
              title="Cota Regional (Centro) - Privada" 
              color="border-l-4 border-l-purple-400"
            />
            <StudentList 
              students={result.privateBroad} 
              title="Ampla Concorrência - Privada" 
              color="border-l-4 border-l-purple-600"
            />
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-800 border-l-4 border-orange-500 pl-3 pt-6">Classificáveis (Lista de Espera)</h2>
        <div className="text-sm text-gray-500 mb-2 italic">
          * Os candidatos classificáveis estão organizados por cota de origem para facilitar a convocação em caso de vagas remanescentes, seguindo a ordem de classificação de cada grupo.
        </div>
        
        <StudentList 
          students={result.waitingPCD} 
          title="CLASSIFICÁVEIS - Cota PCD" 
          color="border-l-4 border-l-orange-300" 
        />
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-6">
             <StudentList 
              students={result.waitingPublicLocal} 
              title="CLASSIFICÁVEIS - Regional (Centro) - Pública" 
              color="border-l-4 border-l-orange-400"
            />
            <StudentList 
              students={result.waitingPublicBroad} 
              title="CLASSIFICÁVEIS - Ampla - Pública" 
              color="border-l-4 border-l-orange-500"
            />
          </div>

          <div className="space-y-6">
             <StudentList 
              students={result.waitingPrivateLocal} 
              title="CLASSIFICÁVEIS - Regional (Centro) - Privada" 
              color="border-l-4 border-l-orange-400"
            />
            <StudentList 
              students={result.waitingPrivateBroad} 
              title="CLASSIFICÁVEIS - Ampla - Privada" 
              color="border-l-4 border-l-orange-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};