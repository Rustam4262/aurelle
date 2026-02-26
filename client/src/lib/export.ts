import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Export data to Excel file
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName: string = "Sheet1"
) {
  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate Excel file and trigger download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export multiple sheets to Excel
 */
export function exportToExcelMultiSheet(
  sheets: Array<{ name: string; data: Record<string, any>[] }>,
  filename: string
) {
  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Add each sheet
  sheets.forEach((sheet) => {
    const worksheet = XLSX.utils.json_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  });

  // Generate Excel file and trigger download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export table element to Excel
 */
export function exportTableToExcel(
  tableId: string,
  filename: string,
  sheetName: string = "Sheet1"
) {
  const table = document.getElementById(tableId);
  if (!table) {
    console.error(`Table with id "${tableId}" not found`);
    return;
  }

  // Create worksheet from table
  const worksheet = XLSX.utils.table_to_sheet(table);

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate Excel file and trigger download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Format data for better Excel export
 * Converts dates, handles null values, etc.
 */
export function formatDataForExcel<T extends Record<string, any>>(
  data: T[],
  columnMapping?: Record<keyof T, string>
): Record<string, any>[] {
  return data.map((row) => {
    const formattedRow: Record<string, any> = {};

    Object.keys(row).forEach((key) => {
      const columnName = columnMapping?.[key as keyof T] || key;
      let value = row[key];

      // Handle dates
      if (value instanceof Date) {
        value = value.toLocaleString();
      } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        value = new Date(value).toLocaleString();
      }

      // Handle null/undefined
      if (value === null || value === undefined) {
        value = "";
      }

      // Handle booleans
      if (typeof value === "boolean") {
        value = value ? "Yes" : "No";
      }

      // Handle arrays
      if (Array.isArray(value)) {
        value = value.join(", ");
      }

      // Handle objects (stringify)
      if (typeof value === "object" && value !== null) {
        value = JSON.stringify(value);
      }

      formattedRow[columnName] = value;
    });

    return formattedRow;
  });
}

/**
 * Export data to PDF
 */
export function exportToPDF<T extends Record<string, any>>(
  data: T[],
  filename: string,
  title: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    columns?: Array<{ header: string; dataKey: keyof T }>;
  }
) {
  const doc = new jsPDF({
    orientation: options?.orientation || 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Add title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 20);

  // Add timestamp
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  // Prepare columns
  const columns = options?.columns || Object.keys(data[0] || {}).map((key) => ({
    header: key,
    dataKey: key,
  }));

  // Prepare rows
  const rows = data.map((row) =>
    columns.map((col) => {
      const rawValue = row[col.dataKey];
      let formattedValue: any = rawValue;

      // Handle dates
      if ((rawValue as any) instanceof Date) {
        formattedValue = (rawValue as Date).toLocaleDateString();
      } else if (typeof rawValue === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(rawValue)) {
        formattedValue = new Date(rawValue).toLocaleDateString();
      }

      // Handle null/undefined
      if (rawValue === null || rawValue === undefined) {
        formattedValue = '';
      }

      // Handle booleans
      if (typeof rawValue === 'boolean') {
        formattedValue = rawValue ? 'Yes' : 'No';
      }

      // Handle arrays
      if (Array.isArray(rawValue)) {
        formattedValue = rawValue.join(', ');
      }

      // Handle objects
      if (typeof rawValue === 'object' && rawValue !== null && !((rawValue as any) instanceof Date)) {
        formattedValue = JSON.stringify(rawValue);
      }

      return String(formattedValue);
    })
  );

  // Add table
  autoTable(doc, {
    head: [columns.map((col) => col.header)],
    body: rows,
    startY: 35,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [102, 126, 234], // Purple color
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    margin: { top: 35 },
  });

  // Add footer with page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save PDF
  doc.save(`${filename}.pdf`);
}

/**
 * Export multiple tables to PDF
 */
export function exportMultiTableToPDF(
  tables: Array<{
    title: string;
    data: Record<string, any>[];
    columns?: Array<{ header: string; dataKey: string }>;
  }>,
  filename: string,
  mainTitle: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Add main title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(mainTitle, 14, 20);

  // Add timestamp
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  let currentY = 40;

  tables.forEach((table, _index) => {
    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    // Add table title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(table.title, 14, currentY);
    currentY += 8;

    // Prepare columns
    const columns = table.columns || Object.keys(table.data[0] || {}).map((key) => ({
      header: key,
      dataKey: key,
    }));

    // Prepare rows
    const rows = table.data.map((row) =>
      columns.map((col) => String(row[col.dataKey] || ''))
    );

    // Add table
    autoTable(doc, {
      head: [columns.map((col) => col.header)],
      body: rows,
      startY: currentY,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [102, 126, 234],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  });

  // Add footer with page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save PDF
  doc.save(`${filename}.pdf`);
}

/**
 * Export admin report to PDF
 */
export function exportAdminReportToPDF(report: {
  title: string;
  subtitle?: string;
  stats: Array<{ label: string; value: string | number }>;
  tables: Array<{
    title: string;
    data: Record<string, any>[];
    columns?: Array<{ header: string; dataKey: string }>;
  }>;
  filename: string;
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header
  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(report.title, 14, 20);

  if (report.subtitle) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(report.subtitle, 14, 30);
  }

  doc.setTextColor(0, 0, 0);

  // Stats section
  if (report.stats.length > 0) {
    let currentY = 50;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary Statistics', 14, currentY);
    currentY += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    report.stats.forEach((stat, index) => {
      const x = 14 + (index % 2) * 90;
      const y = currentY + Math.floor(index / 2) * 10;

      doc.setFont('helvetica', 'bold');
      doc.text(`${stat.label}:`, x, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(stat.value), x + 50, y);
    });

    currentY += Math.ceil(report.stats.length / 2) * 10 + 10;

    // Tables
    report.tables.forEach((table) => {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(table.title, 14, currentY);
      currentY += 6;

      const columns = table.columns || Object.keys(table.data[0] || {}).map((key) => ({
        header: key,
        dataKey: key,
      }));

      const rows = table.data.map((row) =>
        columns.map((col) => String(row[col.dataKey] || ''))
      );

      autoTable(doc, {
        head: [columns.map((col) => col.header)],
        body: rows,
        startY: currentY,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [102, 126, 234],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    });
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);

    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.line(14, doc.internal.pageSize.getHeight() - 15, 196, doc.internal.pageSize.getHeight() - 15);

    // Page number
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );

    // Footer text
    doc.text(
      'AURELLE Admin Report',
      14,
      doc.internal.pageSize.getHeight() - 10
    );

    doc.text(
      new Date().toLocaleDateString(),
      196,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }

  doc.save(`${report.filename}.pdf`);
}
