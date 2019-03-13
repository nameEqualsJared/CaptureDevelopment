
// -- Begin utility functions --

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

function formatDate(snipID) {
    // given a snipID (which is the date the snip was taked on), this function returns a nicer looking date as a string
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "November", "December"]
    const date = new Date(snipID);
    return `${months[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}, ${date.toLocaleTimeString()}`;
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

// link up with data store
const db = new DB();

// set the constant "RENDER_LOC": the div any snips will be populated in
const RENDER_LOC = document.getElementById("renderedSnips");

class MainUI {
    /*
    This class models the main UI of the page -- the scrollable snip feed.

    It contains two fields:
        .snipsRendered: an array of of all ID's of the the snips in the Main UI. 
            This is set in the constructor.
            NOTE: if this array is empty, that is interpreted as "render all snips". Otherwise, it will just render the snips in the array.
        .TagUI: a reference to a TagUI object.
            This is set in the setTagUiRef method. It needs to be set for the class to function properly.
            Whilst I certainly wish I didn't have to couple these classes together, I think it is "needed". The reason is that if the user changes a snip in the MainUI, I want the TagUI to automatically update -- thus I need a reference to the TagUI to do this updating. 
            The field is used in the renderSnipToHTML method, to ensure that changing the snipText (and thus perhaps updating the tags) updates the tags on the left. Further, it is also used to update the tags on the left if a snip is deleted.

    It has a setter and a getter for the .snipsRendered field. Setting the field will update the UI.

    It also contains two (ideally private) helper methods: renderSnipToHTML and renderAllSnips.

    It's constructor will default to rendering all the snips.
    */

    constructor(snipsRendered = []) {
        this.setSnipsRendered(snipsRendered); // an array of all the ID's of snips to be rendered (if empty will render all, and defaults to empty).
    }

    setTagUiRef(TagUiRef) {
        this.TagUI = TagUiRef;
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
                    const snip = await db.getSnip(snipID);
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

    // Would ideally be a private method
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
        ta.onchange = async () => {
            try {
                let snipToUpdate = await db.getSnip(snip._id);
                await db.updateSnipText(snipToUpdate, ta.value); // update the snip with the new text (properly updates both DBs).
                this.TagUI.renderSideTags(); // update the tags on the left.
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
        p.textContent = "Snipped on " + formatDate(snip._id);
        d2.appendChild(p);

        //adding a delete button
        const b = document.createElement('button');
        const btext = document.createTextNode("Delete");
        b.appendChild(btext);
        b.onclick = async () => {
            const toDelete = confirm("Are you sure you want to delete this snip? This action cannot be undone!");
            if (toDelete) {
                //delete the snips from the DBs
                await db.deleteSnip(snip._id);

                //remove the snip from the page
                b.parentNode.parentNode.parentNode.removeChild(b.parentNode.parentNode);

                //update the tags on the left
                this.TagUI.renderSideTags();
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

    // Would ideally be a private method
    async renderAllSnips() {
        //this functions grabs all of the snips out of storage, and renders them into the page
        try {
            const doc = await db.allSnips();
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
        .MainUI: a reference to a MainUI object.
            This is set in the setMainUiRef method. It needs to be set for the class to function properly.
            Again, whilst I wish I didn't have to in a sense couple the TagUI and MainUI classes together, I believe this is "needed". The reason is that, if the user clicks on a set of tags on the left, the MainUI needs to update.
            This field is used in the linkSideTags() method, to update the MainUI if the user clicks on a tag.

    The renderSideTags() method just renders the tags on the side. The linkSideTags() method adds the functionality that, if the user clicks a tag, the MainUI is updated to display those tags.

    It's constructor will set up the tags on the left, such that clicking on them will appropirately change the snips in the mainUI.
    */

    constructor() {
        this.renderSideTags();
    }

    setMainUiRef(MainUiRef) {
        this.MainUI = MainUiRef;
    }


    // meant to be public
    async renderSideTags() {

        const sideTagsDiv = document.querySelector(".tag-sidebar-buttons");

        clearChildrenFromDiv(sideTagsDiv);

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

        // set up all the tag buttons
        try {
            let docs = await db.allTags();
            for (let entry of docs.rows) {
                //render the snip into the page (as a button)
                const tagName = entry.id; //tagName is literally the text of the tag
                const btn = document.createElement("button");
                const i = document.createElement("i");
                i.className = "fas fa-tag";
                btn.appendChild(i);
                const btnText = document.createTextNode(tagName);
                btn.appendChild(btnText);
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



    // would ideally be private
    linkSideTags() {
        // This function makes it so if the user clicks any side tag, the mainUI will update

        const buttons = document.querySelectorAll(".tag-sidebar-buttons button");
        for (let btn of buttons) {
            btn.onclick = async () => {
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
                    let doc = await db.getTag(btn.textContent); // recall btn.textContent is the tag itself
                    if (btn.toggledOn) {
                        // if the btn has been toggled on, 
                        const snipsToRender = arrayUnion(this.MainUI.getSnipsRendered(), doc.snipsWithThisTag);

                        this.MainUI.setSnipsRendered(snipsToRender)
                    } else {
                        // otherwise (so the button has been turned off), we will subtract the ids of all snips with this tag
                        const snipsToRender = arraySubtract(this.MainUI.getSnipsRendered(), doc.snipsWithThisTag);

                        this.MainUI.setSnipsRendered(snipsToRender)
                    }

                } catch (err) {
                    console.log(err);
                }
            }
        }
    }

}


let mainUI = new MainUI();
let tagUI = new TagUI();

// link the two UI's together (regretably). This is done so that changing the snipText will update the tags on the left; deleting a snip will update the tags on the left; and so that clicking on tags on the left will update the snips shown in the MainUI.
mainUI.setTagUiRef(tagUI);
tagUI.setMainUiRef(mainUI);

