
// -- Begin utility functions --

function z() {
    a();
    b();
}

function a() {
    dbForSnips.destroy();
}

function b() {
    dbForTags.destroy();
}

function c() {
    dbForSnips.allDocs({ include_docs: true, descending: true }, function (err, doc) {
        if (err) {
            console.log(err);
        } else {
            console.log(doc.rows);
        }
    });
}

function d() {
    dbForTags.allDocs({ include_docs: true, descending: true }, function (err, doc) {
        if (err) {
            console.log(err);
        } else {
            console.log(doc.rows);
        }
    });
}

function clearChildrenFromDiv(div) {

    while (div.firstChild) {
        //null evaluates to false. firstChild() will return null if there are no children. 
        //so the while says to continue as long as we have remaining children

        div.removeChild(div.firstChild);
    }
}

function arrayUnion(a, b) {
    // adds the contents of array b to array a, returning a new array
    // Ignores dupliates

    let res = a.slice(); // start with a copy of a

    // for each element of b...
    for (let elem of b) {
        if (a.indexOf(elem) === -1) {
            // add it to res if it's not already in a
            res.push(elem);
        }
    }
    return res;
}

function arraySubtract(a, b) {
    // subtracts the contents of array b from a, returning a new array

    let res = [];
    // for each element of a...
    for (let elem of a) {
        if (b.indexOf(elem) === -1) {
            // if the elem isn't in b, add it to res
            res.push(elem);
        }
    }
    return res;
}

// -- End utility functions --

// link up the export button
document.querySelector(".export-button").onclick = function () {
    chrome.tabs.create({ url: "export.html" });
}

//link up the contact button
document.querySelector(".contact-button").onclick = function () {
    chrome.tabs.create({ url: "contact.html" });
}


// link up the databases
const dbForSnips = new PouchDB("dbForSnips");
const dbForTags = new PouchDB("dbForTags");

// set the constant "RENDER_LOC": the div any snips will be populated in
const RENDER_LOC = document.getElementById("renderedSnips");


class MainUI {
    /*
    This class models the main UI of the page -- the scrollable snip feed.

    It contains one field:
        .snipsRendered: an array of of all ID's of the the snips in the Main UI.
        
        NOTE: if this array is empty, that is interpreted as "render all snips". Otherwise, it will just render the snips in the array.

    It has both a setter and getter for this field. Setting the field will update the UI.

    It also contains two (ideally private) helper methods: renderSnipToHTML and renderAllSnips.

    It's constructor will default to rendering all the snips.
    */

    constructor(snipsRendered = []) {
        this.setSnipsRendered(snipsRendered); // an array of all the ID's of snips to be rendered (if empty will render all).
    }

    async setSnipsRendered(snipsRendered) {
        this.snipsRendered = snipsRendered;

        //clear the page
        clearChildrenFromDiv(RENDER_LOC);

        if (this.snipsRendered.length === 0) {
            // if the array is empty, just render all the snips.
            this.renderAllSnips();

        } else {
            // otherwise, get the each snip out of the db and render it
            for (let snipID of this.snipsRendered) {
                try {
                    let snip = await dbForSnips.get(snipID);
                    this.renderSnipToHTML(snip);
                } catch (err) {
                    console.log(err);
                }
            }
        }
    }

    getSnipsRendered() {
        return this.snipsRendered;
    }

    // The following would ideally be a private method
    renderSnipToHTML(snip) {
        /* This function renders the provided snip (required to have url, title, favIconUrl, snipText, _id, and _rev members) to the page. Specifically, it renders it "into" the RENDER_LOC. */

        //Each snip is in its own div 
        const d = document.createElement('div');
        d.className = "singleSnip";

        //everything for the title, link, and favicon of the site
        const d3 = document.createElement("d");
        d3.className = "title-container";
        const p1 = document.createElement('p');
        p1.className = "snip-title";
        const s1 = document.createElement('span');
        s1.textContent = "Title: ";
        p1.append(s1);
        const a = document.createElement("a");
        a.href = snip.url;
        a.textContent = snip.title;
        p1.appendChild(a)
        const img = document.createElement("img");
        img.src = snip.favIconUrl;
        img.height = 20;
        img.width = 20;
        d3.appendChild(p1);
        d3.appendChild(img);
        d.appendChild(d3);

        //everything for the snip text
        const ta = document.createElement('textarea');
        ta.rows = 20;
        ta.cols = 80;
        ta.value = snip.snipText;
        ta.onblur = async function () {
            try {
                let snipToUpdate = await dbForSnips.get(snip._id);
                updateSnipText(snipToUpdate, ta.value);
            } catch (err) {
                console.log(err);
            }
        }
        d.appendChild(ta);

        //adding the date snipped 
        const d2 = document.createElement("div");
        d2.className = "flexbox-container";
        const p = document.createElement("p");
        p.className = "snipped-on";
        p.textContent = "Snipped on " + snip._id;
        d2.appendChild(p);

        //adding a delete button
        const b = document.createElement('button');
        const btext = document.createTextNode("Delete");
        b.appendChild(btext);
        b.onclick = function () {
            const toDelete = confirm("Are you sure you want to delete this snip? This action cannot be undone!");
            if (toDelete) {
                //delete the snips from the DBs
                deleteSnip(snip);

                //remove the snip from the page
                b.parentNode.parentNode.parentNode.removeChild(b.parentNode.parentNode);
            }
        }
        d2.appendChild(b);
        d.appendChild(d2);
        RENDER_LOC.appendChild(d);

        // The following code just makes the height of the textarea holding the snipText responsive; i.e., it makes it always fit all of the text. Has to be put here because the textarea must be rendered into the page for it to have a non-zero scroll height (and this is the first point it is)
        ta.style.height = ta.scrollHeight + "px";
        ta.addEventListener("input", function () {
            ta.style.height = ta.scrollHeight + "px";
        });

    }

    // And again, would also be private
    async renderAllSnips() {
        //this functions grabs all of the snips out of storage, and renders them into the page
        try {
            const doc = await dbForSnips.allDocs({ include_docs: true, descending: true });
            for (let entry of doc.rows) {
                const snip = entry.doc;
                this.renderSnipToHTML(snip);
            }
        } catch (err) {
            console.log(err);
        }
    }

}

class TagUI {
    /*
    This class models the TagUI on the left.
    It contains one field:
        .mainUI -- a reference to the MainUI, passed in the constructor. The class needs a reference to this because, as the user interacts with the tag sidebar, it changes what is rendered in the MainUI.
    
    It's constructor will set up the tags on the left, such that clicking on them will appropirately change the snips in the mainUI.

    */

    constructor(mainUI) {
        this.mainUI = mainUI;
        this.renderSideTags();
    }

    // would ideally be private
    async renderSideTags() {

        //Set up the deselect all button
        const deselectButton = document.querySelector(".deselect");
        deselectButton.onclick = function () {
            //toggle all the buttons off
            const tagButtons = document.querySelectorAll(".tag-sidebar-buttons button");
            for (let btn of tagButtons) {
                btn.toggledOn = false;
                btn.style.backgroundColor = "rgb(238, 238, 238)";
            }

            mainUI.setSnipsRendered([]); //update the main UI
        }

        const sideTagsDiv = document.querySelector(".tag-sidebar-buttons");

        // set up all the tag buttons
        try {
            let docs = await dbForTags.allDocs({ include_docs: false, descending: true });
            for (let entry of docs.rows) {
                //render the snip into the page (as a button)
                const tagName = entry.id; //tagName is literally the text of the tag
                const btn = document.createElement("button");
                const i = document.createElement("i");
                i.className = "fas fa-tag";
                btn.appendChild(i);
                btn.textContent = tagName;
                sideTagsDiv.appendChild(btn);

                //additional property added on to the button, which tracks whether or not it is toggled on. Defaults to false
                btn.toggledOn = false;
            }
        } catch (err) {
            console.log(err);
        }

        // link up all the buttons so that clicking on them updates the mainUI
        this.linkSideTags();

    }

    // would also ideally be private
    linkSideTags() {
        // This function makes it so if the user clicks any side tag, the mainUI will update

        const buttons = document.querySelectorAll(".tag-sidebar-buttons button");
        for (let btn of buttons) {
            btn.onclick = async function () {
                // following makes the button toggle-able
                if (btn.toggledOn) {
                    btn.toggledOn = false;
                    btn.style.backgroundColor = "rgb(238, 238, 238)";
                } else {
                    btn.toggledOn = true;
                    btn.style.backgroundColor = "rgb(212, 212, 212)";
                }

                // and this code is what actually makes clicking them update the mainUI.
                try {
                    let doc = await dbForTags.get(btn.textContent);
                    if (btn.toggledOn) {
                        // if the btn has been toggled on, 
                        const snipsToRender = arrayUnion(mainUI.getSnipsRendered(), doc.snipsWithThisTag);

                        mainUI.setSnipsRendered(snipsToRender)
                    } else {
                        // otherwise (so the button has been turned off), we will subtract the ids of all snips with this tag
                        const snipsToRender = arraySubtract(mainUI.getSnipsRendered(), doc.snipsWithThisTag);

                        mainUI.setSnipsRendered(snipsToRender)
                    }

                } catch (err) {
                    console.log(err);
                }
            }
        }
    }

}


let mainUI = new MainUI();
let tagUI = new TagUI(mainUI);

