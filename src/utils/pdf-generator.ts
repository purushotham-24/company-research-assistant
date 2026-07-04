import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CompanyReport } from '@/types';

// Extend jsPDF interface to avoid typescript compilation error on autotable
interface ExtendedjsPDF extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

export function generateCompanyPDF(report: CompanyReport): ExtendedjsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  }) as ExtendedjsPDF;

  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;

  // Primary Theme Colors
  const primaryDark: [number, number, number] = [15, 23, 42];
  const goldAccent: [number, number, number] = [226, 168, 45];
  const textDark: [number, number, number] = [51, 65, 85];

  // 1. Header Banner (Dark Theme)
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Gold separator line
  doc.setDrawColor(goldAccent[0], goldAccent[1], goldAccent[2]);
  doc.setLineWidth(1.5);
  doc.line(0, 40, pageWidth, 40);

  // Banner Text
  doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('RELU CONSULTANCY • COMPANY RESEARCH REPORT', margin, 15);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.text(report.name.toUpperCase(), margin, 28);

  // 2. Report Details Footer Helper (Draws on all pages)
  const addFooter = (currentPage: number, totalPages: number) => {
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    doc.setTextColor(148, 163, 184); // Slate 400
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Generated using AI Company Research Assistant • Relu Consultancy', margin, pageHeight - 10);
    doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth - margin - 15, pageHeight - 10);
  };

  let currentY = 50;

  // Function to ensure section header formatting
  const addSectionHeader = (title: string, yPos: number): number => {
    doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, margin, yPos);
    
    doc.setDrawColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);
    return yPos + 8;
  };

  // Section 1: Company Information
  currentY = addSectionHeader('COMPANY INFORMATION', currentY);

  const infoRows = [
    ['Website', report.website],
    ['Phone', report.phone || 'Not publicly listed'],
    ['Address', report.address || 'Not publicly listed'],
    ['Industry', report.industry || 'Technology'],
    ['Research Date', report.timestamp],
    ['AI Model Used', report.model],
  ];

  autoTable(doc,{
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: {
  fontSize: 9,
  cellPadding: 2.5,
  textColor: [51, 65, 85] as [number, number, number],
},
    columnStyles: {
  0: {
    cellWidth: 35,
    fontStyle: 'bold',
  },
  1: {
    cellWidth: 45,
  },
},
    body: infoRows,
  });

  currentY = (doc.lastAutoTable?.finalY || currentY) + 10;

  // Section 2: Executive Summary
  currentY = addSectionHeader('EXECUTIVE SUMMARY', currentY);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  
  const summaryLines = doc.splitTextToSize(report.summary, pageWidth - 2 * margin);
  doc.text(summaryLines, margin, currentY);
  currentY += summaryLines.length * 5 + 8;

  // Section 3: Products & Services
  if (report.products.length > 0 || report.services.length > 0) {
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = 25;
    }
    currentY = addSectionHeader('PRODUCTS & SERVICES', currentY);

    const items: string[] = [];
    report.products.forEach(p => {
      const source = p.url ? ` (Source: ${p.url})` : '';
      items.push(`• ${p.name}${source}`);
    });
    report.services.forEach(s => {
      const source = s.url ? ` (Source: ${s.url})` : '';
      items.push(`• ${s.name}${source}`);
    });

    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    items.slice(0, 10).forEach(item => {
      if (currentY > pageHeight - 20) {
        doc.addPage();
        currentY = 25;
      }
      const lines = doc.splitTextToSize(item, pageWidth - 2 * margin);
      doc.text(lines, margin, currentY);
      currentY += lines.length * 4.5;
    });
    currentY += 8;
  }

  // Section 4: AI-Generated Pain Points
  if (report.pain_points.length > 0) {
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = 25;
    }
    currentY = addSectionHeader('AI-GENERATED PAIN POINTS', currentY);

    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    report.pain_points.forEach(p => {
      if (currentY > pageHeight - 20) {
        doc.addPage();
        currentY = 25;
      }
      const source = p.url ? ` (Source: ${p.url})` : '';
      const text = `• ${p.point}${source}`;
      const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
      doc.text(lines, margin, currentY);
      currentY += lines.length * 4.5;
    });
    currentY += 8;
  }

  // Section 5: Competitor Analysis
  if (report.competitors && report.competitors.length > 0) {
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 25;
    }
    currentY = addSectionHeader('COMPETITOR ANALYSIS', currentY);

    const competitorHeaders = [['Competitor', 'Website', 'Reason Selected']];
    const competitorRows = report.competitors.map(c => [
      c.name,
      c.website,
      c.reason || 'Direct competitor in the same sector',
    ]);

    autoTable(doc,{
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'striped',
     headStyles: {
  fillColor: [15,23,42],
  textColor: [255,255,255],
  fontSize:9,
  fontStyle:'bold'
},
      bodyStyles:{
    fontSize:8.5,
    textColor:[51,65,85],
},
     columnStyles:{
  0:{
      cellWidth:35,
      fontStyle:'bold'
  },
  1:{
      cellWidth:45
  },
  2:{
      cellWidth:'auto'
  }
},
      head: competitorHeaders,
      body: competitorRows,
    });

    currentY = (doc.lastAutoTable?.finalY || currentY) + 10;
  }

  // Section 6: Research Sources
  if (report.sources && report.sources.length > 0) {
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 25;
    }
    currentY = addSectionHeader('RESEARCH SOURCES', currentY);
    
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    report.sources.slice(0, 8).forEach(src => {
      if (currentY > pageHeight - 20) {
        doc.addPage();
        currentY = 25;
      }
      doc.text(`• ${src}`, margin, currentY);
      currentY += 4;
    });
  }

  // Add footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  return doc;
}
