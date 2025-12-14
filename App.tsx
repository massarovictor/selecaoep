import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { CourseView } from './components/CourseView';
import { GeneralStats } from './components/GeneralStats';
import { processCSV } from './utils';
import { generatePDF, generateXLS, generateDOC } from './export';
import { ProcessingSummary, Course } from './types';
import { Trophy, FileText, FileSpreadsheet, RefreshCw, File } from 'lucide-react';

type Tab = 'GERAL' | Course;

const App: React.FC = () => {
  const [data, setData] = useState<ProcessingSummary | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('GERAL');

  const handleFileUpload = (content: string) => {
    try {
      const result = processCSV(content);
      setData(result);
      setActiveTab('GERAL');
    } catch (error) {
      console.error(error);
      alert('Erro ao processar o arquivo CSV. Verifique o formato.');
    }
  };

  const handleReset = () => {
    if(confirm("Deseja carregar um novo arquivo? Os dados atuais serão perdidos.")) {
      setData(null);
      setActiveTab('GERAL');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-green-700 text-white shadow-lg sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-2 rounded-full">
              <Trophy className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-none">SIS Seleção EEEP</h1>
            </div>
          </div>
          {data && (
             <div className="flex items-center space-x-3">
               <button 
                onClick={() => generateXLS(data)}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 px-3 py-2 rounded-md transition-colors text-sm font-medium border border-green-500"
                title="Baixar planilha Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button 
                onClick={() => generateDOC(data)}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-md transition-colors text-sm font-medium border border-blue-500"
                title="Baixar em Word"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Word</span>
              </button>
              <button 
                onClick={() => generatePDF(data)}
                className="flex items-center space-x-2 bg-white text-green-800 hover:bg-gray-100 px-3 py-2 rounded-md transition-colors text-sm font-medium shadow-sm"
                title="Baixar lista em PDF"
              >
                <File className="w-4 h-4" />
                <span className="hidden sm:inline">PDF Oficial</span>
              </button>
              <button
                onClick={handleReset}
                className="p-2 hover:bg-green-600 rounded-full transition-colors text-green-200 hover:text-white"
                title="Reiniciar"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
             </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {!data ? (
          <div className="max-w-2xl mx-auto mt-12">
            <div className="bg-white rounded-xl shadow-md p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Processamento de Seleção</h2>
                <p className="text-gray-600 mt-2">Carregue a planilha CSV exportada do Google Forms para gerar a classificação oficial conforme o Edital.</p>
              </div>
              <FileUpload onFileUpload={handleFileUpload} />
              
              <div className="mt-8 border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Regras Aplicadas</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="mr-2 text-green-500">•</span>
                    Cálculo da média anual (6º ao 8º) + média disciplinas (9º).
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-green-500">•</span>
                    Distribuição de cotas: PCD (5%), Pública (80%), Privada (20%).
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-green-500">•</span>
                    Subcotas territoriais (30% para o bairro Centro).
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-green-500">•</span>
                    Critérios de desempate: Idade, Português, Matemática.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
             <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
                <div className="flex items-center space-x-2 text-gray-700">
                  <span className="font-bold text-lg text-green-700">{data.totalProcessed}</span>
                  <span className="font-medium text-sm text-gray-500">candidatos processados no total</span>
                </div>
                <div className="text-sm text-gray-400 italic">
                  * Utilize os botões no topo para baixar o resultado final.
                </div>
             </div>

            {/* Course Tabs */}
            <div className="mb-8 border-b border-gray-200 print:hidden overflow-x-auto">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  key="GERAL"
                  onClick={() => setActiveTab('GERAL')}
                  className={`
                      whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                      ${activeTab === 'GERAL'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    `}
                >
                  Visão Geral
                </button>
                {(Object.values(Course) as Course[]).map((course) => (
                  <button
                    key={course}
                    onClick={() => setActiveTab(course)}
                    className={`
                      whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                      ${activeTab === course
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    `}
                  >
                    {course}
                  </button>
                ))}
              </nav>
            </div>

            {/* Print Header (Visible only on print) */}
            <div className="hidden print:block mb-8 text-center border-b pb-4">
               <h2 className="text-2xl font-bold">RESULTADO PRELIMINAR - SELEÇÃO EEEP 2026</h2>
               <h3 className="text-xl mt-2">{activeTab === 'GERAL' ? 'VISÃO GERAL' : activeTab}</h3>
            </div>

            {/* Active Course View */}
            {activeTab === 'GERAL' ? (
              <GeneralStats data={data} />
            ) : (
              data.results
                .filter(r => r.course === activeTab)
                .map(r => (
                  <CourseView key={r.course} result={r} />
                ))
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12 py-6 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p>© 2025 EEEP Professora Maria Célia Pinheiro Falcão • Desenvolvido por Massaro Victor.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
