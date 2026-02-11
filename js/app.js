document.addEventListener("DOMContentLoaded", () => {
  console.log("testing");
  const grid = document.getElementById("grades-grid");

  BOOKS_DATA.grades.forEach((grade) => {
    
    const card = document.createElement("div");
    card.className = "grade-card";
    card.setAttribute("role", "listitem");
    console.log(grade);
    const hasBooks = grade.books.length > 0;
    

    let booksHtml = "";
    if (hasBooks) {
      booksHtml = grade.books
        .map(
          (book) => `
        <div class="book-item">
          <span class="book-item-title">${book.title}</span>
          <div class="book-actions">
            <a class="btn btn-view" href="viewer.html?book=${book.id}">View</a>
            <a class="btn btn-download" href="${book.pdfUrl}" download>Download</a>
          </div>
        </div>`
        )
        .join("");
    } else {
      booksHtml = '<p class="empty-grade">Coming soon!</p>';
    }

    card.innerHTML = `
      <h2 class="grade-card-header" style="background:${grade.color}">
        <span class="icon" aria-hidden="true">${grade.icon}</span> ${grade.name}
      </h2>
      <div class="grade-card-body">${booksHtml}</div>
    `;

    grid.appendChild(card);
  });
});
