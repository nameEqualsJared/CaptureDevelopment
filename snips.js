
let dbForSnips = new PouchDB("dbForSnips");
let dbForTags = new PouchDB("dbForTags");


//This div will house all the rendered snips, regardless of whether it's really all snips in storage or snips with a certain tag 
let divForRenderedSnips = document.createElement("div");
divForRenderedSnips.id = "renderedSnips";
document.querySelector("main").appendChild(divForRenderedSnips);


function renderAllSnips() {
	//this functions grabs all of the snips out of storage, and renders them into the page
	dbForSnips.allDocs({ include_docs: true, descending: true }, function (err, doc) {
		if (err) {
			console.log(err);
		} else {


			for (let entry of doc.rows) {
				let snip = entry.doc;

				renderSnipToHTML(divForRenderedSnips, snip);
			}
		}
	});
}

renderAllSnips();


function clearChildrenFromDiv(div) {

	console.log("INSIDE CLEAR");

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

function renderSnipToHTML(providedDiv, snip) {

	/* This function renders the provided snip (required to have url, title, snipText, _id, and _rev members) to the page. Specifically, it renders it "into" the provided HTML element (should be a div). */

	//Each snip is in its own div 
	let d = document.createElement('div');
	d.className = "singleSnip";

	//everything for the title/link
	let p1 = document.createElement('p');
	p1.className = "snip-title";
	let s1 = document.createElement('span');
	let s1text = document.createTextNode("Title: ");
	s1.appendChild(s1text);
	p1.append(s1);
	let a = document.createElement("a");
	a.href = snip.url;
	let atext = document.createTextNode(snip.title)
	a.appendChild(atext);
	p1.appendChild(a)
	d.appendChild(p1);

	//everything for the snip text
	let ta = document.createElement('textarea');
	ta.rows = 20;
	ta.cols = 80;
	let tatext = document.createTextNode(snip.snipText);
	ta.appendChild(tatext);
	ta.addEventListener("input", function () {
		//Code for just saving plain snip text (does not deal with tags)

		//as it is, this saves the snip anew everytime there is any change in the textarea.
		//In the future may want to use .onblur to prevent so many saves...
		//But for now, why not :P. It's convenient 
		dbForSnips.get(snip._id, function (err, doc) {
			if (err) {
				console.log(err);
			} else {
				doc.snipText = ta.value;
				dbForSnips.put(doc);
			}
		});
	});

	ta.onblur = function () {
		//Code for updating tags
		//NOTE: currently we only check for tags on an onblur basis (so when the ta loses focus. Note that reloading the page does not count as losing focus). Idk how else you would do it as they type..... 
		//NOTE: the thing above handles general snipText saving 


		//"currentTagsInTA" will hold all the tags in the text area (TA) currently 
		// let currentTagsInTA = [];///
		let tagArrayWithHashtags = ta.value.match(/(#[1-9a-zA-z-]+)/g);
		let currentTagsInTA = [];
		if (tagArrayWithHashtags) {
			//if the tagArrayWithHashtags exists (not null)
			for (let tag of tagArrayWithHashtags) {
				currentTagsInTA.push(tag.slice(1));
				//simply add the tags to the array, with the hashtags removed
			}
		}

		//maybe in the future don't even check if the arrays are different? Idk. It's a lot of computational work (you have to sort em); see the arraysEquals function. Could always just update the db's regardless....May be faster. idk

		let oldTagsInSnip = snip.tags;

		if (!arraysEqual(currentTagsInTA, oldTagsInSnip)) {

			//get the snip with this _id out of storage. We are going to update it (see end of the this block) (if you're going to update something, you have to get it out of storage to get the _rev field. Then you just put the whole object back with your updates)
			dbForSnips.get(snip._id, function (err, doc) {
				if (err) {
					console.log(err);
				} else {

					let snip = doc;

					//put all the new tags in the snip. Ie, only the tags currently in the text area are the ones that should be in the snip
					snip.tags = currentTagsInTA;

					//for each of the new tags in the snip, make sure the dbForTags has this snip's _id for each tag 
					for (let tag of snip.tags) {
						dbForTags.get(tag, function (err, doc) {
							if (err) {
								if (err.message === "missing") {
									//this error means that the tag doesn't have an entry in dbForTags. Thus, add it
									dbForTags.put({ _id: tag, snipsWithThisTag: [snip._id] });

								} else {
									//otherwise, just log the error
									console.log(err)
								}

							} else {
								// if we reach here, the tag exists in dbForTags.

								//check if this tag in the DB already has this snip's id		
								if (doc.snipsWithThisTag.indexOf(snip._id) === -1) {
									//If we reach here, it doesn't. So add

									doc.snipsWithThisTag.push(snip._id);
									dbForTags.put(doc);
								}
							}

						});

					}


					//also, for each tag in the oldTagsInSnip array: make sure to remove this snip's id from the dbForTags if the tag is no longer in the snip.
					for (let tag of oldTagsInSnip) {

						if (snip.tags.indexOf(tag) === -1) {
							//in other words, if the tag was removed (if it's no longer a current tag)

							//remove it from the db
							dbForTags.get(tag, function (err, doc) {
								if (err) {
									console.log(err);
								} else {

									let snipsWithThisTag = doc.snipsWithThisTag;

									let index = snipsWithThisTag.indexOf(snip._id);
									if (index > -1) {
										//this means the snip's _id did exist. so remove it
										snipsWithThisTag.splice(index);
									}

									if (snipsWithThisTag.length === 0) {
										//no more snips exist with this tag. So just delete the whole entry in dbForTags.

										dbForTags.remove(doc);
									} else {
										//otherwise update the entry
										dbForTags.put(doc);
									}

								}

							});
						}
					}

					//update the snip in dbForSnips (because the tags have changed)
					dbForSnips.put(snip)

				}
			})

		}

	}

	d.appendChild(ta);

	//adding the date snipped a delete button
	let d2 = document.createElement("div");
	d2.className = "flexbox-container";
	let p = document.createElement("p");
	p.className = "snipped-on";
	let split = snip._id.slice(0, 10).split("-");
	const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	let ptext = document.createTextNode("Snipped on " + months[split[1] - 1] + " " + split[2] + ", " + split[0]);
	p.appendChild(ptext);
	d2.appendChild(p);

	let b = document.createElement('button');
	let btext = document.createTextNode("Delete");
	b.appendChild(btext);
	b.onclick = function () {
		var toDelete = confirm("Are you sure you want to delete this snip? This action cannot be undone!");
		if (toDelete === true) {
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


function setUpSideTags() {
	// This function renders all of the tags into the Tags sidebar. It also sets up each button so you can click it and see all the associated snips. It is used frequently to update all the tags in the side bar if anything changes.

	let sideTagsDiv = document.querySelector(".tag-sidebar-buttons");

	dbForTags.allDocs({ include_docs: false, descending: true }, function (err, doc) {
		console.log("IN ASYNC");
		clearChildrenFromDiv(sideTagsDiv); 	//delete all the buttons, because we are rerendering / updating them
		console.log(sideTagsDiv.outerHTML);
		if (err) {
			console.log(err);
		} else {
			console.log(JSON.stringify(doc));
			for (let entry of doc.rows) {
				let tagName = entry.id; //tagName is literally the text of the tag
				let btn = document.createElement("button");
				let i = document.createElement("i");
				i.className = "fas fa-tag";
				btn.appendChild(i);
				let btnText = document.createTextNode(tagName);
				btn.appendChild(btnText);
				sideTagsDiv.appendChild(btn);

			}
		}
		console.log(sideTagsDiv.outerHTML);
	});
}

setUpSideTags();