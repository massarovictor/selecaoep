import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ProcessingSummary, CourseResult, Student } from './types';

// Helper to format date
const formatDate = (date: Date) => {
  return date.toLocaleDateString('pt-BR');
};

const formatScore = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Helper to get status string
const getStatusLabel = (status?: string) => {
  if (status === 'SELECTED') return 'CLASSIFICADO';
  if (status === 'WAITING') return 'CLASSIFICÁVEL';
  return '-';
};

// Define structure for lists
type StudentGroup = {
  title: string;
  students: Student[];
  isWaiting?: boolean;
};

const getGroupsForCourse = (result: CourseResult): StudentGroup[] => [
  // Selected
  { title: "CLASSIFICADOS - Cota PCD", students: result.pcd },
  { title: "CLASSIFICADOS - Cota Regional (Centro) - Pública", students: result.publicLocal },
  { title: "CLASSIFICADOS - Ampla Concorrência - Pública", students: result.publicBroad },
  { title: "CLASSIFICADOS - Cota Regional (Centro) - Privada", students: result.privateLocal },
  { title: "CLASSIFICADOS - Ampla Concorrência - Privada", students: result.privateBroad },

  // Waiting
  { title: "CLASSIFICÁVEIS - Cota PCD", students: result.waitingPCD, isWaiting: true },
  { title: "CLASSIFICÁVEIS - Cota Regional (Centro) - Pública", students: result.waitingPublicLocal, isWaiting: true },
  { title: "CLASSIFICÁVEIS - Ampla Concorrência - Pública", students: result.waitingPublicBroad, isWaiting: true },
  { title: "CLASSIFICÁVEIS - Cota Regional (Centro) - Privada", students: result.waitingPrivateLocal, isWaiting: true },
  { title: "CLASSIFICÁVEIS - Ampla Concorrência - Privada", students: result.waitingPrivateBroad, isWaiting: true },
];

export const generatePDF = (data: ProcessingSummary) => {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(16);
  doc.text("RESULTADO PRELIMINAR - SELEÇÃO EEEP 2026", 14, 15);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 22);

  let currentY = 30;

  data.results.forEach((courseResult) => {
    // Check if we need a new page for the course header
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    // Course Header
    doc.setFillColor(22, 163, 74); // Green-600
    doc.rect(14, currentY, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`CURSO: ${courseResult.course}`, 16, currentY + 5.5);
    currentY += 12;

    const groups = getGroupsForCourse(courseResult);

    groups.forEach((group) => {
      // Group Subheader
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");

      // Check space
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }

      doc.text(`${courseResult.course} - ${group.title}`, 14, currentY);
      currentY += 2;

      if (group.students.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text("Não há candidatos inscritos nesta modalidade.", 14, currentY + 4);
        currentY += 10;
        doc.setFont("helvetica", "normal"); // Reset
      } else {
        const tableData = group.students.map((s) => {
          // Adicionar indicadores de elegibilidade para candidatos cotistas na ampla
          const badges: string[] = [];
          if (s.eligibilities?.includes('PCD') && s.allocatedIn && !s.allocatedIn.includes('PCD')) {
            badges.push('PCD');
          }
          if ((s.eligibilities?.includes('PUBLICA_CENTRO') || s.eligibilities?.includes('PRIVADA_CENTRO'))
            && s.allocatedIn && !s.allocatedIn.includes('REGIÃO')) {
            badges.push('Centro');
          }

          const name = badges.length > 0
            ? `${s.name} [${badges.join(', ')}]`
            : s.name;

          return [
            s.rank,
            s.registrationNumber,
            name,
            formatScore(s.finalScore),
            getStatusLabel(s.status)
          ];
        });

        autoTable(doc, {
          startY: currentY,
          head: [['Pos', 'Inscrição', 'Nome Completo', 'Nota', 'Situação']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
            4: { cellWidth: 30, halign: 'center' }
          },
          margin: { left: 14, right: 14 },
          didDrawPage: (data: any) => {
            // Reset currentY for next loop if it spans pages
            currentY = data.cursor.y + 10;
          }
        });

        // Update Y after table
        currentY = (doc as any).lastAutoTable.finalY + 5;

        // Adicionar nota de rodapé sempre após listas de cota (PCD ou Centro)
        const isQuotaList = group.title.includes('Cota PCD') || group.title.includes('Cota Regional');
        if (isQuotaList && group.students.length > 0) {
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.setFont("helvetica", "italic");
          doc.text("Candidatos cotistas concorrem primeiro nas vagas reservadas. Classificáveis aparecem também na lista de Ampla Concorrência.", 14, currentY);
          currentY += 8;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);
        }

        currentY += 5;
      }
    });

    currentY += 5; // Extra gap between courses
  });

  doc.save("resultado_selecao_eeep_2026.pdf");
};

export const generateXLS = (data: ProcessingSummary) => {
  const wb = XLSX.utils.book_new();

  data.results.forEach(courseResult => {
    const rows: any[] = [];
    const groups = getGroupsForCourse(courseResult);

    groups.forEach(group => {
      // Add a header row for the category
      rows.push({}); // spacer
      rows.push({ "Nome Completo": `>>> ${group.title.toUpperCase()}` });

      if (group.students.length === 0) {
        rows.push({
          "Curso": courseResult.course,
          "Lista": group.title,
          "Nome Completo": "Não há candidatos inscritos nesta modalidade."
        });
      } else {
        // Add students
        group.students.forEach((s) => {
          // Indicadores de elegibilidade
          const badges: string[] = [];
          if (s.eligibilities?.includes('PCD') && s.allocatedIn && !s.allocatedIn.includes('PCD')) {
            badges.push('PCD');
          }
          if ((s.eligibilities?.includes('PUBLICA_CENTRO') || s.eligibilities?.includes('PRIVADA_CENTRO'))
            && s.allocatedIn && !s.allocatedIn.includes('REGIÃO')) {
            badges.push('Centro');
          }

          const name = badges.length > 0
            ? `${s.name} [${badges.join(', ')}]`
            : s.name;

          rows.push({
            "Curso": courseResult.course,
            "Lista": group.title,
            "Posição": s.rank,
            "Inscrição": s.registrationNumber,
            "Nome Completo": name,
            "Data Nasc.": formatDate(s.birthDate),
            "Nota Final": formatScore(s.finalScore),
            "Situação": getStatusLabel(s.status),
            "Cotas Elegíveis": s.eligibilities?.join(', ') || '',
            "Observações": s.warnings.join("; ")
          });
        });

        // Adicionar nota sempre após listas de cota (PCD ou Centro)
        const isQuotaList = group.title.includes('Cota PCD') || group.title.includes('Cota Regional');
        if (isQuotaList) {
          rows.push({});
          rows.push({
            "Nome Completo": "Candidatos cotistas concorrem primeiro nas vagas reservadas. Classificáveis aparecem também na lista de Ampla Concorrência."
          });
        }
      }
    });

    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    const wscols = [
      { wch: 25 }, // Curso
      { wch: 40 }, // Lista
      { wch: 8 },  // Pos
      { wch: 10 }, // Inscrição
      { wch: 40 }, // Nome
      { wch: 12 }, // Data
      { wch: 10 }, // Nota
      { wch: 15 }, // Situação
      { wch: 35 }, // Cotas Elegíveis
      { wch: 40 }, // Obs
    ];
    ws['!cols'] = wscols;

    const sheetName = courseResult.course.substring(0, 30).replace(/\//g, "-");
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, "resultado_selecao_eeep_2026.xlsx");
};

export const generateDOC = (data: ProcessingSummary) => {
  // Construct HTML for Word
  let html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Resultado EEEP 2026</title>
      <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th { background-color: #22c55e; color: white; border: 1px solid #000; padding: 5px; font-size: 10pt; }
        td { border: 1px solid #000; padding: 5px; font-size: 10pt; }
        .course-header { background-color: #166534; color: white; padding: 8px; font-weight: bold; font-size: 12pt; margin-top: 20px; border: 1px solid #000; }
        .group-header { font-weight: bold; margin-top: 15px; margin-bottom: 5px; font-size: 11pt; background-color: #f3f4f6; padding: 5px; border: 1px solid #ddd; }
        .center { text-align: center; }
        .right { text-align: right; }
        .empty-msg { font-style: italic; color: #666; padding: 10px; text-align: center; }
        h1 { font-size: 16pt; text-align: center; }
        p { text-align: center; font-size: 9pt; color: #555; }
      </style>
    </head>
    <body>
      <h1>RESULTADO PRELIMINAR - SELEÇÃO EEEP 2026</h1>
      <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
  `;

  data.results.forEach(res => {
    html += `<div class='course-header'>CURSO: ${res.course}</div>`;
    const groups = getGroupsForCourse(res);

    groups.forEach(g => {
      html += `<div class='group-header'>${res.course} - ${g.title}</div>`;

      html += `
        <table>
          <thead>
            <tr>
              <th width="50">Pos</th>
              <th width="80">Inscrição</th>
              <th>Nome Completo</th>
              <th width="80">Nota</th>
              <th width="120">Situação</th>
            </tr>
          </thead>
          <tbody>
      `;

      if (g.students.length === 0) {
        html += `<tr><td colspan="5" class="empty-msg">Não há candidatos inscritos nesta modalidade.</td></tr>`;
      } else {
        g.students.forEach((s) => {
          // Indicadores de elegibilidade
          const badges: string[] = [];
          if (s.eligibilities?.includes('PCD') && s.allocatedIn && !s.allocatedIn.includes('PCD')) {
            badges.push('PCD');
          }
          if ((s.eligibilities?.includes('PUBLICA_CENTRO') || s.eligibilities?.includes('PRIVADA_CENTRO'))
            && s.allocatedIn && !s.allocatedIn.includes('REGIÃO')) {
            badges.push('Centro');
          }

          const nameHtml = badges.length > 0
            ? `${s.name} <span style="font-size: 8pt; color: #666;">[${badges.join(', ')}]</span>`
            : s.name;

          html += `
            <tr>
              <td class="center">${s.rank}</td>
              <td class="center">${s.registrationNumber}</td>
              <td>${nameHtml}</td>
              <td class="right"><b>${formatScore(s.finalScore)}</b></td>
              <td class="center">${getStatusLabel(s.status)}</td>
            </tr>
          `;
        });

        // Adicionar nota de rodapé sempre após listas de cota (PCD ou Centro)
        const isQuotaList = g.title.includes('Cota PCD') || g.title.includes('Cota Regional');
        if (isQuotaList && g.students.length > 0) {
          html += `<tr><td colspan="5" style="font-size: 8pt; font-style: italic; color: #666; padding-top: 10px;">Candidatos cotistas concorrem primeiro nas vagas reservadas. Classificáveis aparecem também na lista de Ampla Concorrência.</td></tr>`;
        }
      }

      html += `</tbody></table>`;
    });
  });

  html += "</body></html>";

  // Create Blob and Download
  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'resultado_selecao_eeep_2026.doc';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
