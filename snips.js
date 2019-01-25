
// ---- a bunch of utility functions used throughout file -----

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


async function renderAllSnips() {
	//this functions grabs all of the snips out of storage, and renders them into the page
	try {
		const doc = await dbForSnips.allDocs({ include_docs: true, descending: true });
		for (let entry of doc.rows) {
			const snip = entry.doc;
			renderSnipToHTML(divForRenderedSnips, snip);
		}
	} catch (err) {
		console.log(err);
	}
}

function clearChildrenFromDiv(div) {

	while (div.firstChild) {
		//null evaluates to false. firstChild() will return null if there are no children. 
		//so the while says to continue as long as we have remaining children

		div.removeChild(div.firstChild);
	}
}

function arraysEqual(a, b) {
	//credit to enyo on SO for the function.
	if (a === b) return true;
	if (a == null || b == null) return false;
	if (a.length != b.length) return false;

	// If you don't care about the order of the elements inside
	// the array, you should sort both arrays here.
	let aSorted = a.sort();
	let bSorted = b.sort();

	for (var i = 0; i < aSorted.length; ++i) {
		if (aSorted[i] !== bSorted[i]) return false;
	}
	return true;
}

function arrayUnion(a, b) {
	// adds the contents of array b to array a, returning a new array
	// Ignores dupliates

	let res = a.slice(); // make a copy of a, put it in res
	for (let elem of b) {
		if (a.indexOf(elem) === -1) {
			// add it to res if it is not in a
			res.push(elem);
		}
	}
	return res;
}

function arraySubtract(a, b) {
	// subtracts the contents of array b from a, returning a new array

	let res = [];
	for (let elem of a) {
		if (b.indexOf(elem) === -1) {
			// add it to the result only if the elem is not in b
			res.push(elem);
		}
	}
	return res;
}



function renderSnipToHTML(providedDiv, snip) {

	/* This function renders the provided snip (required to have url, title, favIconUrl, snipText, _id, and _rev members) to the page. Specifically, it renders it "into" the provided HTML element (should be a div). */

	//Each snip is in its own div 
	const d = document.createElement('div');
	d.className = "singleSnip";

	//everything for the title/link
	const p1 = document.createElement('p');
	p1.className = "snip-title";
	const s1 = document.createElement('span');
	s1.textContent = "Title: ";
	p1.append(s1);
	const a = document.createElement("a");
	a.href = snip.url;
	a.textContent = snip.title;
	p1.appendChild(a)
	d.appendChild(p1);

	//everything for the snip text
	const ta = document.createElement('textarea');
	ta.rows = 20;
	ta.cols = 80;
	ta.value = snip.snipText;
	ta.onblur = async function () {
		try {
			let snipToUpdate = await dbForSnips.get(snip._id)
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
	providedDiv.appendChild(d);

	// The following code just makes the height of the textarea holding the snipText responsive; i.e., it makes it always fit all of the text. Has to be put here because the textarea must be rendered into the page for it to have a non-zero scroll height (and this is the first point it is)
	ta.style.height = ta.scrollHeight + "px";
	ta.addEventListener("input", function () {
		ta.style.height = ta.scrollHeight + "px";
	});

}

// ---- end utility functions ----


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


//This div will house all the rendered snips, regardless of whether it's really all snips in storage or snips with a certain tag 
let divForRenderedSnips = document.createElement("div");
divForRenderedSnips.id = "renderedSnips";
document.querySelector("main").appendChild(divForRenderedSnips);



function setUpSideTags() {
	// This function renders all of the tags into the Tags sidebar. It also sets up each toggle button so you can click it and see all the associated snips. It is used frequently to update all the tags in the side bar if the tags in any snip changes.
	// NOTE: This function mutates the the snipsToBeRendered global variable! Specifically, it will ensure that global variable holds all the snips that need to be rendered, based on the users selection in the Tag section of the page.

	//Set up the deselect all button
	const deselectButton = document.querySelector(".deselect");
	deselectButton.onclick = function () {
		//toggle all the buttons off
		const tagButtons = document.querySelectorAll(".tag-sidebar-buttons button");
		for (let btn of tagButtons) {
			btn.toggledOn = false;
			btn.style.backgroundColor = "rgb(238, 238, 238)";
		}

		// resets the snipsToBeRendered global variable
		snipsToBeRendered = [];

		// rerender all the snips
		renderSnips();
	}

	const sideTagsDiv = document.querySelector(".tag-sidebar-buttons");

	// set up all the tag buttons
	dbForTags.allDocs({ include_docs: false, descending: true }, function (err, doc) {

		clearChildrenFromDiv(sideTagsDiv); 	//delete all the buttons, because we are rerendering / updating them

		if (err) {
			console.log(err);
		} else {
			for (let entry of doc.rows) {
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

				// set up the button such that clicking it will be toggleable, and that if on, it will be rendered on the page
				btn.onclick = function () {
					// following makes the button toggle-able
					if (btn.toggledOn) {
						btn.toggledOn = false;
						btn.style.backgroundColor = "rgb(238, 238, 238)";
					} else {
						btn.toggledOn = true;
						btn.style.backgroundColor = "rgb(212, 212, 212)";
					}

					// recall tagName is tag itself
					dbForTags.get(tagName, function (err, doc) {
						if (err) {
							console.log(err);
						} else {
							if (btn.toggledOn) {
								// if the btn has been toggled on, we will add the ids of all snips with this tag to the snipsToBeRendered global. Then we'll rerender the snips.
								arrayUnion(snipsToBeRendered, doc.snipsWithThisTag);
								// Mutating global variable!

								renderSnips();
							} else {
								// otherwise (so the button has been turned off), we will subtract the ids of all snips with this tag from the snipsToBeRendered global. Then we'll rerender the snips. 
								arraySubtract(snipsToBeRendered, doc.snipsWithThisTag);
								//Mutating global variable!

								renderSnips();
							}
						}
					});
				}

			}
		}
	});
}

setUpSideTags();


// NOTE: The following is (and is meant to be) a global variable. Whilst I try to avoid globals, here I think it is actually the simplest solution.
// the renderSnips() function references this array. If it is empty, it will just render all the snips. Otherwise, it will render all the snips in the array.
snipsToBeRendered = [];
// snipsToBeRendered either a) contains the ids of all snips to be rendered, or b) contains nothing, indicating that all snips should be rendered 
// The global is mutated in setUpSideTags(), whenever the user clicks on a tag button (or deselect all)

function renderSnips() {
	// this function references the snipsToBeRendered global variable to render snips into the page. It is what actually does (or at least kicks off) the rendering.
	// if the snipsToBeRendered array is empty, it will just render all the snips. Otherwise, it will render all the snips in the snipsToBeRendered array.

	clearChildrenFromDiv(divForRenderedSnips); //clear the page

	// render the appropriate snips
	if (snipsToBeRendered.length === 0) {
		renderAllSnips();
	} else {
		for (snipId of snipsToBeRendered) {
			dbForSnips.get(snipId, function (err, doc) {
				if (err) {
					console.log(err);
				} else {
					renderSnipToHTML(divForRenderedSnips, doc);
				}
			});
		}
	}
}

renderSnips();


