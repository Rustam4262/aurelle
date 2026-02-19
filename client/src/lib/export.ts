import * as XLSX from "xlsx";

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
