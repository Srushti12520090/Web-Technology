async function loadBooks(){
  const search=document.getElementById("search").value;
  const category=document.getElementById("category").value;
  const sort=document.getElementById("sort").value;
  const params=new URLSearchParams({search,category,sort});
  const container=document.getElementById("books");
  container.innerHTML="<p>Loading books...</p>";

  try{
    const res=await fetch("/api/books?"+params);
    const books=await res.json();
    if(!books.length){container.innerHTML="<p>No books found.</p>";return;}
    container.innerHTML=books.map(book=>`
      <article class="book-card">
        <div class="book-cover">📖</div>
        <div class="book-info">
          <h3>${escapeHtml(book.title)}</h3>
          <div class="author">by ${escapeHtml(book.author)}</div>
          <div class="rating">★ ${book.rating}</div>
          <p class="desc">${escapeHtml(book.description)}</p>
          <div class="price">₹${book.price}</div>
          <button class="btn" onclick="alert('Added ${escapeHtml(book.title)} to cart!')">Add to Cart</button>
        </div>
      </article>`).join("");
  }catch(e){container.innerHTML="<p>Unable to load books. Make sure MongoDB is running.</p>";}
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
loadBooks();