const convertToCSV = (data: any[], headers: { key: string, label: string }[]): string => {
    const headerRow = headers.map(h => h.label).join(',');
    const dataRows = data.map(row => {
        return headers.map(header => {
            let cellData = row[header.key];

            if (cellData === null || cellData === undefined) {
                return '';
            }
            
            if (typeof cellData === 'object') {
                cellData = JSON.stringify(cellData);
            }

            let cell = String(cellData);
            if (cell.includes('"') || cell.includes(',') || cell.includes('\n')) {
                cell = `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
        }).join(',');
    });

    return [headerRow, ...dataRows].join('\n');
};

export const exportToCsv = (filename: string, data: any[], headers: { key: string, label: string }[]) => {
    if (!data || data.length === 0) {
        console.error("No data available to export.");
        alert("No data available to export.");
        return;
    }

    const csvString = convertToCSV(data, headers);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};
