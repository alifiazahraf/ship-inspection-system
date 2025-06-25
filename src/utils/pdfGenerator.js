import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-toastify';

const getBase64FromImageUrl = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/jpeg', 0.8);
      resolve(dataURL);
    };
    img.onerror = (error) => {
      console.error('Error loading image for PDF:', error);
      resolve(null);
    };
    img.src = url;
  });
};

export const generateFindingsPDF = async (ship, findings, user, logActivity) => {
  try {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Set font
    doc.setFont('helvetica', 'normal');
    
    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN TEMUAN INSPEKSI', doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });
    
    // Ship information
    const shipInfoY = 50;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMASI KAPAL', 25, shipInfoY);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nama Kapal: ${ship.ship_name}`, 25, shipInfoY + 10);
    doc.text(`Kode Kapal: ${ship.ship_code}`, 25, shipInfoY + 20);
    doc.text(`Total Temuan: ${findings.length}`, 25, shipInfoY + 30);
    doc.text(`Tanggal Laporan: ${new Date().toLocaleDateString('id-ID')}`, 25, shipInfoY + 40);

    // Load images for all findings
    const imagePromises = [];
    findings.forEach(finding => {
      if (finding.before_photo) {
        imagePromises.push(getBase64FromImageUrl(finding.before_photo));
      } else {
        imagePromises.push(Promise.resolve(null));
      }
      if (finding.after_photo) {
        imagePromises.push(getBase64FromImageUrl(finding.after_photo));
      } else {
        imagePromises.push(Promise.resolve(null));
      }
    });

    const images = await Promise.all(imagePromises);

    // Table columns
    const tableColumns = [
      { header: 'No', dataKey: 'no' },
      { header: 'Tanggal', dataKey: 'date' },
      { header: 'Temuan', dataKey: 'finding' },
      { header: 'Kategori', dataKey: 'category' },
      { header: 'PIC Kapal', dataKey: 'pic_ship' },
      { header: 'PIC Kantor', dataKey: 'pic_office' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Foto Before', dataKey: 'before_photo' },
      { header: 'Foto After', dataKey: 'after_photo' }
    ];

    // Table data
    const tableRows = findings.map((finding, index) => ({
      no: finding.no,
      date: new Date(finding.date).toLocaleDateString('id-ID'),
      finding: finding.finding,
      category: finding.category,
      pic_ship: finding.pic_ship,
      pic_office: finding.pic_office,
      status: finding.status,
      before_photo: finding.before_photo,
      after_photo: finding.after_photo,
      before_image_data: images[index * 2],
      after_image_data: images[index * 2 + 1]
    }));

    // Configure table styles
    const tableOptions = {
      startY: shipInfoY + 60,
      head: [tableColumns.map(col => col.header)],
      body: tableRows.map(row => tableColumns.map(col => {
        if (col.dataKey === 'before_photo' || col.dataKey === 'after_photo') {
          return row[col.dataKey] ? '' : 'Tidak Ada';
        }
        return row[col.dataKey];
      })),
      theme: 'striped',
      headStyles: {
        fillColor: [52, 144, 220],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        minCellHeight: 40
      },
      columnStyles: {
        0: { cellWidth: 35, halign: 'center' },
        1: { cellWidth: 65, halign: 'center' },
        2: { cellWidth: 200, halign: 'left' },
        3: { cellWidth: 80, halign: 'center' },
        4: { cellWidth: 80, halign: 'center' },
        5: { cellWidth: 80, halign: 'center' },
        6: { cellWidth: 55, halign: 'center' },
        7: { cellWidth: 80, halign: 'center' },
        8: { cellWidth: 80, halign: 'center' }
      },
      styles: {
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      margin: { left: 25, right: 25 },
      showHead: 'everyPage',
      didDrawCell: function (data) {
        // Add images to cells
        if (data.column.index === 7 && data.cell.section === 'body') {
          const rowIndex = data.row.index;
          if (tableRows[rowIndex] && tableRows[rowIndex].before_image_data) {
            const imageData = tableRows[rowIndex].before_image_data;
            try {
              doc.addImage(imageData, 'JPEG', data.cell.x + 2, data.cell.y + 2, 50, 35);
            } catch (e) {
              doc.setFontSize(8);
              doc.text('Ada', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: 'center' });
            }
          }
        }
        if (data.column.index === 8 && data.cell.section === 'body') {
          const rowIndex = data.row.index;
          if (tableRows[rowIndex] && tableRows[rowIndex].after_image_data) {
            const imageData = tableRows[rowIndex].after_image_data;
            try {
              doc.addImage(imageData, 'JPEG', data.cell.x + 2, data.cell.y + 2, 50, 35);
            } catch (e) {
              doc.setFontSize(8);
              doc.text('Ada', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: 'center' });
            }
          }
        }
      }
    };

    // Add table to PDF
    autoTable(doc, tableOptions);

    // Add footer with page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Halaman ${i} dari ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 30,
        { align: 'center' }
      );
      doc.text(
        `Dicetak pada: ${new Date().toLocaleString('id-ID')}`,
        doc.internal.pageSize.getWidth() - 50,
        doc.internal.pageSize.getHeight() - 30,
        { align: 'right' }
      );
    }

    // Generate filename
    const fileName = `Laporan_Temuan_${ship.ship_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Save the PDF
    doc.save(fileName);
    toast.success('PDF berhasil didownload!');
    
    // Log activity if provided
    if (user && logActivity) {
      logActivity(
        user,
        'VIEW',
        `Download laporan PDF kapal: ${ship.ship_name} (${findings.length} temuan)`,
        ship
      );
    }

    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    toast.error('Terjadi kesalahan saat membuat PDF');
    return false;
  }
}; 