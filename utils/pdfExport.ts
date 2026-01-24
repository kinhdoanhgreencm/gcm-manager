import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Export HTML element to PDF
 * @param elementId - ID of the HTML element to export
 * @param filename - Name of the PDF file (default: 'document.pdf')
 */
export const exportToPDF = async (elementId: string, filename: string = 'hop-dong.pdf'): Promise<void> => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    // Get all page containers
    const pageContainers = element.querySelectorAll('.page-container');
    if (pageContainers.length > 0) {
      // If we have page containers, export each page separately
      await exportMultiPagePDF(pageContainers, filename);
    } else {
      // Fallback to single page export
      await exportSinglePagePDF(element, filename);
    }

  } catch (error) {
    console.error('Error exporting to PDF:', error);
    alert('Có lỗi xảy ra khi xuất PDF. Vui lòng thử lại.');
  }
};

/**
 * Export multiple pages to PDF
 * @param a4Pages - NodeList of A4 page elements
 * @param filename - Name of the PDF file
 */
const exportMultiPagePDF = async (a4Pages: NodeListOf<Element>, filename: string): Promise<void> => {
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default;
  const pdf = new jsPDF('p', 'mm', 'a4');

  for (let i = 0; i < a4Pages.length; i++) {
    const pageElement = a4Pages[i] as HTMLElement;

    // Clone the page element to avoid modifying the original
    const clonedPage = pageElement.cloneNode(true) as HTMLElement;

    // Remove page-specific styling that might interfere
    clonedPage.style.border = 'none';
    clonedPage.style.boxShadow = 'none';
    clonedPage.style.margin = '0';

    // Temporarily add to DOM for html2canvas
    clonedPage.style.position = 'absolute';
    clonedPage.style.left = '-9999px';
    clonedPage.style.top = '-9999px';
    clonedPage.style.width = '210mm'; // A4 width
    clonedPage.style.minHeight = '297mm'; // A4 height
    clonedPage.style.background = 'white';
    clonedPage.style.padding = '15mm'; // Standard margins
    clonedPage.style.boxSizing = 'border-box';
    clonedPage.style.fontSize = '12px';
    clonedPage.style.lineHeight = '1.4';

    document.body.appendChild(clonedPage);

    try {
      // Wait a bit for styles to apply
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(clonedPage, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: clonedPage.offsetWidth,
        height: clonedPage.offsetHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: clonedPage.offsetWidth,
        windowHeight: clonedPage.offsetHeight
      });

      if (i > 0) {
        pdf.addPage();
      }

      // Add the full page image
      const imgWidth = 210; // A4 width
      const imgHeight = 297; // A4 height

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);

      // Add page number at the bottom
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Trang ${i + 1}/${a4Pages.length}`, 105, 290, { align: 'center' });

    } catch (error) {
      console.error(`Error processing page ${i + 1}:`, error);
      // Continue with other pages
    } finally {
      document.body.removeChild(clonedPage);
    }
  }

  pdf.save(filename || `hop-dong-${Date.now()}.pdf`);
};

/**
 * Export single page to PDF (fallback)
 * @param element - HTML element to export
 * @param filename - Name of the PDF file
 */
const exportSinglePagePDF = async (element: HTMLElement, filename: string): Promise<void> => {
  // Create canvas from HTML element
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    width: element.scrollWidth,
    height: element.scrollHeight
  });

  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default;
  const pdf = new jsPDF('p', 'mm', 'a4');

  // Calculate dimensions to fit A4
  const imgWidth = 190; // Leave some margin
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, imgWidth, imgHeight);
  pdf.save(filename);
};

/**
 * Export contract template to PDF
 * @param filename - Name of the PDF file (optional)
 */
export const exportContractToPDF = async (filename?: string): Promise<void> => {
  const contractElement = document.querySelector('.contract-template') as HTMLElement;
  if (!contractElement) {
    alert('Không tìm thấy nội dung hợp đồng để xuất PDF');
    return;
  }

  try {
    // Get all A4 pages
    const a4Pages = contractElement.querySelectorAll('.a4-page');
    if (a4Pages.length > 0) {
      await exportMultiPagePDF(a4Pages, filename || `hop-dong-${Date.now()}.pdf`);
    } else {
      // Fallback: create temporary single page
      const clonedElement = contractElement.cloneNode(true) as HTMLElement;

      const tempId = 'contract-pdf-export';
      clonedElement.id = tempId;
      clonedElement.style.width = '800px';
      clonedElement.style.position = 'absolute';
      clonedElement.style.left = '-9999px';
      clonedElement.style.top = '-9999px';
      clonedElement.style.background = 'white';

      document.body.appendChild(clonedElement);

      try {
        await exportSinglePagePDF(clonedElement, filename || `hop-dong-${Date.now()}.pdf`);
      } finally {
        document.body.removeChild(clonedElement);
      }
    }

  } catch (error) {
    console.error('Error exporting contract to PDF:', error);
    alert('Có lỗi xảy ra khi xuất PDF hợp đồng. Vui lòng thử lại.');
  }
};