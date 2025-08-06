// Enhanced CSV export with better error handling and validation
interface ExportOptions {
  delimiter?: string;
  includeHeaders?: boolean;
  dateFormat?: 'iso' | 'local' | 'short';
  numberFormat?: 'raw' | 'formatted';
}

const DEFAULT_EXPORT_OPTIONS: Required<ExportOptions> = {
  delimiter: ',',
  includeHeaders: true,
  dateFormat: 'local',
  numberFormat: 'formatted'
};

// Utility to format cell data based on type and options
const formatCellData = (data: any, options: Required<ExportOptions>): string => {
  if (data === null || data === undefined) {
    return '';
  }

  if (data instanceof Date) {
    switch (options.dateFormat) {
      case 'iso':
        return data.toISOString();
      case 'short':
        return data.toLocaleDateString();
      default:
        return data.toLocaleString();
    }
  }

  if (typeof data === 'number') {
    if (options.numberFormat === 'formatted') {
      return data.toLocaleString();
    }
    return data.toString();
  }

  if (typeof data === 'object') {
    return JSON.stringify(data);
  }

  return String(data);
};

// Enhanced CSV conversion with better escaping and formatting
const convertToCSV = (
  data: any[], 
  headers: { key: string, label: string }[], 
  options: Required<ExportOptions>
): string => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No data provided for CSV conversion');
  }

  if (!Array.isArray(headers) || headers.length === 0) {
    throw new Error('No headers provided for CSV conversion');
  }

  const rows: string[] = [];

  // Add header row if requested
  if (options.includeHeaders) {
    const headerRow = headers.map(h => escapeCsvCell(h.label, options.delimiter)).join(options.delimiter);
    rows.push(headerRow);
  }

  // Process data rows
    const dataRows = data.map(row => {
      if (!row || typeof row !== 'object') {
        console.warn('Invalid row data encountered:', row);
        return headers.map(() => '').join(options.delimiter);
      }

        return headers.map(header => {
          try {
            const cellData = row[header.key];
            const formattedData = formatCellData(cellData, options);
            return escapeCsvCell(formattedData, options.delimiter);
          } catch (error) {
            console.warn(`Error processing cell data for key ${header.key}:`, error);
            return '';
          }
        }).join(options.delimiter);
    });

  rows.push(...dataRows);
  return rows.join('\n');
};

// Enhanced CSV cell escaping
const escapeCsvCell = (cell: string, delimiter: string): string => {
  if (typeof cell !== 'string') {
    cell = String(cell);
  }

  // Check if escaping is needed
  const needsEscaping = cell.includes('"') || 
                       cell.includes(delimiter) || 
                       cell.includes('\n') || 
                       cell.includes('\r') ||
                       cell.trim() !== cell; // Leading/trailing whitespace

  if (needsEscaping) {
    // Escape quotes by doubling them and wrap in quotes
    return `"${cell.replace(/"/g, '""')}"`;
  }

  return cell;
};

// Enhanced export function with better error handling and options
export const exportToCsv = (
  filename: string, 
  data: any[], 
  headers: { key: string, label: string }[],
  options: ExportOptions = {}
): void => {
  const mergedOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options };

  // Input validation
    if (!data || data.length === 0) {
        const message = "No data available to export.";
        console.error(message);
        alert(message);
        return;
    }

  if (!headers || headers.length === 0) {
    const message = "No headers provided for export.";
    console.error(message);
    alert(message);
    return;
  }

  if (!filename || typeof filename !== 'string') {
    const message = "Invalid filename provided.";
    console.error(message);
    alert(message);
    return;
  }

  try {
    const csvString = convertToCSV(data, headers, mergedOptions);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    // Ensure filename has .csv extension
    const sanitizedFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;

    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", sanitizedFilename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log(`Successfully exported ${data.length} rows to ${sanitizedFilename}`);
    } else {
        throw new Error('Browser does not support file downloads');
    }
  } catch (error) {
    const message = `Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(message, error);
    alert(message);
  }
};

// Utility function to export JSON data
export const exportToJson = (filename: string, data: any): void => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    
    const sanitizedFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
    
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", sanitizedFilename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log(`Successfully exported JSON to ${sanitizedFilename}`);
    } else {
      throw new Error('Browser does not support file downloads');
    }
  } catch (error) {
    const message = `Failed to export JSON: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(message, error);
    alert(message);
  }
};