document.addEventListener("DOMContentLoaded", async () => {
  // --- Get book info from URL ---
  const params = new URLSearchParams(window.location.search);
  const bookId = params.get("book");
  if (!bookId) {
    alert("No book specified.");
    window.location.href = "index.html";
    return;
  }

  let bookInfo = null;
  for (const grade of BOOKS_DATA.grades) {
    const found = grade.books.find((b) => b.id === bookId);
    if (found) {
      bookInfo = { ...found, grade };
      break;
    }
  }
  if (!bookInfo) {
    alert("Book not found.");
    window.location.href = "index.html";
    return;
  }

  // --- DOM refs ---
  const titleEl = document.getElementById("book-title");
  const pageInfoEl = document.getElementById("page-info");
  const container = document.getElementById("flipbook-container");
  const loadingEl = document.getElementById("loading");
  const progressEl = document.getElementById("load-progress");
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const btnPrintPage = document.getElementById("btn-print-page");
  const btnPrintAll = document.getElementById("btn-print-all");
  const btnDownload = document.getElementById("btn-download");

  titleEl.textContent = `${bookInfo.grade.name} - ${bookInfo.title}`;
  document.title = `${bookInfo.grade.name} - ${bookInfo.title}`;

  // --- Load PDF ---
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  let pdfDoc;
  try {
    pdfDoc = await pdfjsLib.getDocument(bookInfo.pdfUrl).promise;
  } catch (err) {
    loadingEl.innerHTML = `<p style="color:#e74c3c">Failed to load PDF.<br>${err.message}</p>
      <a href="index.html" style="color:white;margin-top:1rem">Go back</a>`;
    return;
  }

  const totalPages = pdfDoc.numPages;
  progressEl.textContent = `Rendering ${totalPages} pages...`;

  // --- Determine page dimensions from first page ---
  const firstPage = await pdfDoc.getPage(1);
  const viewport = firstPage.getViewport({ scale: 1 });
  const aspect = viewport.width / viewport.height;

  // Calculate display size to fit screen
  const maxH = window.innerHeight - 160;
  const maxW = window.innerWidth - 40;
  let pageH = Math.min(maxH, 700);
  let pageW = Math.round(pageH * aspect);
  if (pageW * 2 > maxW) {
    pageW = Math.floor(maxW / 2);
    pageH = Math.round(pageW / aspect);
  }

  // Render scale for quality (render at 2x for crisp images)
  const renderScale = Math.max(1.5, (pageH * 2) / viewport.height);

  // --- Render all pages to images ---
  const pageImages = [];

  for (let i = 1; i <= totalPages; i++) {
    progressEl.textContent = `Rendering page ${i} of ${totalPages}...`;
    const page = await pdfDoc.getPage(i);
    const vp = page.getViewport({ scale: renderScale });

    const canvas = document.createElement("canvas");
    canvas.width = vp.width;
    canvas.height = vp.height;
    const ctx = canvas.getContext("2d");

    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    pageImages.push(canvas.toDataURL("image/jpeg", 0.85));
    page.cleanup();
  }

  // --- Build flipbook pages ---
  container.style.width = pageW * 2 + "px";
  container.style.height = pageH + "px";

  pageImages.forEach((src) => {
    const div = document.createElement("div");
    div.className = "page-canvas";
    const img = document.createElement("img");
    img.src = src;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";
    img.style.background = "white";
    div.appendChild(img);
    container.appendChild(div);
  });

  // --- Initialize StPageFlip ---
  const flipBook = new St.PageFlip(container, {
    width: pageW,
    height: pageH,
    size: "fixed",
    minWidth: 200,
    maxWidth: pageW,
    minHeight: 300,
    maxHeight: pageH,
    showCover: true,
    mobileScrollSupport: true,
    drawShadow: true,
    flippingTime: 600,
    useMouseEvents: true,
    swipeDistance: 30,
    autoSize: true,
  });

  flipBook.loadFromHTML(container.querySelectorAll(".page-canvas"));

  // Hide loading
  loadingEl.classList.add("hidden");

  // --- Page tracking ---
  function updatePageInfo() {
    const current = flipBook.getCurrentPageIndex() + 1;
    pageInfoEl.textContent = `Page ${current} of ${totalPages}`;
    btnPrev.disabled = current <= 1;
    btnNext.disabled = current >= totalPages;
  }
  updatePageInfo();
  flipBook.on("flip", updatePageInfo);

  // --- Controls ---
  btnPrev.addEventListener("click", () => flipBook.flipPrev());
  btnNext.addEventListener("click", () => flipBook.flipNext());

  // Print current page
  btnPrintPage.addEventListener("click", () => {
    const idx = flipBook.getCurrentPageIndex();
    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html><head><title>Print Page</title>
      <style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        img { max-width: 100%; max-height: 100vh; }
        @media print { body { margin: 0; } img { max-width: 100%; max-height: 100%; } }
      </style></head><body>
      <img src="${pageImages[idx]}" onload="window.print();window.close();">
      </body></html>`);
    w.document.close();
  });

  // Print all pages
  btnPrintAll.addEventListener("click", () => {
    const w = window.open("", "_blank");
    const imgs = pageImages
      .map(
        (src) =>
          `<img src="${src}" style="max-width:100%;page-break-after:always;">`
      )
      .join("");
    w.document.write(`<!DOCTYPE html><html><head><title>Print All</title>
      <style>
        body { margin: 0; }
        img { max-width: 100%; display: block; }
        @media print { img { max-width: 100%; page-break-after: always; } }
      </style></head><body>${imgs}
      <script>window.onload=function(){window.print();window.close();}<\/script>
      </body></html>`);
    w.document.close();
  });

  // Download PDF
  btnDownload.addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = bookInfo.pdfUrl;
    a.download = `${bookInfo.grade.name}-${bookInfo.title}.pdf`;
    a.click();
  });

  // --- Handle resize ---
  window.addEventListener("resize", () => {
    // Simple approach: reload on significant resize
    // StPageFlip handles minor resizes internally
  });
});
