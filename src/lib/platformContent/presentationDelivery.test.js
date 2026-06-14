import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("documentação visual e tutoriais", () => {
  test("sintetiza um bloco renderizável para documentos publicados sem estrutura", () => {
    const route = read("src/app/api/advogado/documentacao/[slug]/route.js");
    expect(route).toContain("source-pdf-fallback");
    expect(route).toContain('type: "slide_image"');
  });

  test("o visualizador renderiza o PDF autenticado em canvas próprio", () => {
    const frame = read("src/app/dashboard/advogado/documentacao/PresentationFrame.jsx");
    const proxy = read("src/app/api/advogado/documentacao-slide/route.js");
    expect(frame).toContain("/api/advogado/documentacao-slide");
    expect(frame).toContain('import("pdfjs-dist")');
    expect(frame).toContain("pdf.worker.min.mjs");
    expect(frame).toContain("page.render");
    expect(frame).toContain("<canvas");
    expect(frame).not.toContain("<iframe");
    expect(proxy).toContain('"Content-Type": "application/pdf"');
    expect(proxy).toContain(".download(document.source_pdf_path)");
  });

  test("novos vídeos são publicados no próprio upload", () => {
    const upload = read("src/app/api/admin/tutoriais/upload/route.js");
    expect(upload).toContain('status: "PUBLISHED"');
    expect(upload).toContain('message: "Tutorial enviado e publicado."');
  });

  test("a migration ativa o rascunho mais recente quando não existe publicado", () => {
    const migration = read(
      "database/migrations/20260614_publish_existing_platform_tutorials.sql",
    );
    expect(migration).toContain("ROW_NUMBER() OVER");
    expect(migration).toContain("published.status = 'PUBLISHED'");
    expect(migration).toContain("status = 'PUBLISHED'");
  });
});
