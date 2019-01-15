
const dbForSnips = new PouchDB("dbForSnips");

const divForRenderedSnips = document.querySelector(".div-for-rendered-snips");

function renderParagraph(text) {
    // renders a paragraph element into the page with the specified text

    const p = document.createElement("p");
    const ptext = document.createTextNode(text);
    p.appendChild(ptext);
    divForRenderedSnips.appendChild(p);

}

// get all the snips out of the db and render them into the page. Very simple formatting but it is supposed to be an export.
dbForSnips.allDocs({ include_docs: true, descending: true }, function (err, doc) {
    if (err) {
        console.log(err);
    } else {

        for (let entry of doc.rows) {
            const snip = entry.doc;

            renderParagraph("Title: " + snip.title);
            renderParagraph("Link: " + snip.url);
            renderParagraph("Snip Text: " + snip.snipText);
            renderParagraph("Tags: " + snip.tags);
            renderParagraph("Date: " + snip._id.slice(0, 10));
            divForRenderedSnips.appendChild(document.createElement("br"));

        }
    }
});

