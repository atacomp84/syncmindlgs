import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateStudentReportDocx = (studentName: string, analysisData: Record<string, any[]>) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: "Öğrenci Gelişim Raporu",
              bold: true,
              size: 48,
              color: "2E74B5",
            }),
          ],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: `Öğrenci: ${studentName}`,
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: `Tarih: ${new Date().toLocaleDateString('tr-TR')}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        ...Object.entries(analysisData).flatMap(([subject, topics]) => [
          new Paragraph({
            text: `${subject} Analizi`,
            heading: HeadingLevel.HEADING_1,
            border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 } },
            spacing: { before: 400, after: 200 },
          }),
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Konu", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
                  new TableCell({ children: [new Paragraph({ text: "Doğru", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
                  new TableCell({ children: [new Paragraph({ text: "Yanlış", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
                  new TableCell({ children: [new Paragraph({ text: "Boş", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
                  new TableCell({ children: [new Paragraph({ text: "Net", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
                ],
                tableHeader: true,
              }),
              ...topics.map(topic => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(topic.name)] }),
                  new TableCell({ children: [new Paragraph({ text: String(topic.Doğru), alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ text: String(topic.Yanlış), alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ text: String(topic.Boş), alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ text: topic.Net.toFixed(2), alignment: AlignmentType.CENTER, style: "strong" })] }),
                ],
              })),
            ],
          }),
        ]),
      ],
    }],
  });

  Packer.toBlob(doc).then(blob => {
    saveAs(blob, `${studentName}-Gelisim-Raporu.docx`);
  });
};