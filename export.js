
const db = new DB();

const divForRenderedSnips = document.querySelector(".div-for-rendered-snips");

function renderParagraph(text) {
    // renders a paragraph element into the page with the specified text

    const p = document.createElement("p");
    p.textContent = text;
    divForRenderedSnips.appendChild(p);

}

async function renderAll() {
    // get all the snips out of the db and render them into the page. Very simple formatting but it is supposed to be an export.

    try {
        let allSnips = await db.allSnips();
        for (let snip of allSnips) {
            renderParagraph("Title: " + snip.title);
            renderParagraph("Link: " + snip.url);
            renderParagraph("Snip Text: " + snip.snipText);
            renderParagraph("Tags: " + snip.tags);
            renderParagraph("Date: " + snip._id);
            divForRenderedSnips.appendChild(document.createElement("br"));
        }
    } catch (err) {
        console.log(err);
    }
}

renderAll();