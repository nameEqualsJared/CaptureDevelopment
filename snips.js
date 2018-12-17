
let dbForSnips = new PouchDB("dbForSnips");
let dbForTags = new PouchDB("dbForTags");



//This div will house all the rendered snips, regardless of whether it's really all snips in storage or snips with a certain tag (if the user has searched)
let divForRenderedSnips = document.createElement("div");
divForRenderedSnips.id = "renderedSnips";
document.body.appendChild(divForRenderedSnips);


function renderAllSnips() {
	//this functions grabs all of the snips out of storage, and renders them into the page
	dbForSnips.allDocs({ include_docs: true, descending: true }, function (err, doc) {
		if (err) {
			console.log(err);
		} else {


			for (let entry of doc.rows) {
				let snip = entry.doc;

				renderSnipToHTML(divForRenderedSnips, snip);
				console.log(snip)
			}
		}
	});
}

renderAllSnips();


let searchBar = document.getElementById("search");

searchBar.onblur = function () {

	let searchText = searchBar.value;

	if (searchText !== "") {
		//if the search bar is not empty...  

		//clear the page essentially
		clearChildrenFromDiv(divForRenderedSnips);

		// for this tag, use the dbForTags to get out an array of snip IDs of all the snips that have this tag
		dbForTags.get(searchText, function (err, doc) {
			if (err) {
				console.log(err)
			} else {
				console.log(doc)
				let snipsWithThisTag = doc.snipsWithThisTag;

				// for each snip with this tag...
				for (snip of snipsWithThisTag) {

					// get it out of dbForSnips, and render it
					dbForSnips.get(snip, function (err, doc) {
						if (err) {
							console.log(err)
						} else {
							renderSnipToHTML(divForRenderedSnips, doc)
						}
					})

				}

			}
		});

	} else {

		//clear the page essentially
		clearChildrenFromDiv(divForRenderedSnips);


		//re render all the snips into the page
		renderAllSnips();
	}

}






function clearChildrenFromDiv(div) {
	//clear all the snips off the page 
	// (deleting all children of the divForRenderedSnips)
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
	let s1 = document.createElement('span');
	s1.className = 'title';
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
	let tatext = document.createTextNode(snip.snipText);
	ta.appendChild(tatext);
	ta.oninput = function () {
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
	}

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

	//adding a p tag with the _id for debugging purposes (change to show a nice date. use a dict for the month)
	let p = document.createElement("p");
	let ptext = document.createTextNode(snip._id);
	p.appendChild(ptext);
	d.appendChild(p);

	//adding a delete button for this snip
	let b = document.createElement('button');
	let btext = document.createTextNode("Delete");
	b.appendChild(btext);
	b.onclick = function () {
		var toDelete = confirm("Are you sure you want to delete this snip? This action cannot be undone!");
		if (toDelete === true) {
			//delete the snips from the DBs
			deleteSnip(snip);

			//remove the snip from the page
			b.parentNode.parentNode.removeChild(b.parentNode);
		}
	}
	d.appendChild(b);

	providedDiv.appendChild(d);
}



//code for making the textarea responsive; ie, make them resize automatically :)

	//setting initial size
	// console.log(ta.scrollHeight);
	// ta.style.height = ta.scrollHeight;

	//making it responsive
	// ta.onkeyup = function(){
		// ta.style.height = (ta.scrollHeight + 20) + "px";
	// }