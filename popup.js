//linking up all the buttons
const saveButton = document.getElementById("saveButton");
const openSnipsButton = document.getElementById("openSnipsButton");

//initializing the DBs (will either create a new one or link back up to the currently existing one)
const dbForSnips = new PouchDB("dbForSnips");
const dbForTags = new PouchDB("dbForTags");

// defining a new object: the Snip. Snips are the objects used to to store note-site combos -- they are also what dbForSnips stores.
class Snip {
	constructor(_id, url, favIconUrl, title, snipText, tags) {
		this._id = _id; //A string with the date of when the snip was created. Also the unique ID used to save the snip in the DB
		this.url = url;
		this.favIconUrl = favIconUrl;
		this.title = title;
		this.snipText = snipText;
		this.tags = tags; //an array of all the tags contained in the snupText
	}
}


function saveANewSnip() {
	//NOTE: this function modified a global variable! Specifically, it will put the id of the snip that it saves in the "idOfSnipIfAlreadySaved" global!

	//get the current snip text given by the user
	const snipText = document.getElementById("inputText").value;

	//get the current page title and address
	chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
		// Note: I cannot use a more modern async JS technique above, as all chrome extension APIs only currently support the traditional callback technique.
		// Note that the callback function above must be declared async, as we use await below

		const currentURL = tabs[0].url;
		const currentTitle = tabs[0].title;
		const currentFavIconUrl = tabs[0].favIconUrl;

		let tags = [];
		const tagArrayWithHashtags = snipText.match(/(#[1-9a-zA-z-]+)/g);
		if (tagArrayWithHashtags) {
			//if the tagArrayWithHashtags exists (not null)
			for (let tag of tagArrayWithHashtags) {
				tags.push(tag.slice(1));
				//simply add the tags to the array, with the hashtags removed
			}
		}
		let uniqueTags = [...new Set(tags)]; // we only want to store the unique tags -- don't care about duplicates.

		//_id holds the date of when this snip was created in a string. Also acts as the unique id to get the snip from the db
		const _id = new Date().toLocaleString();

		//Constructing the new snip.
		currentSnip = new Snip(_id, currentURL, currentFavIconUrl, currentTitle, snipText, uniqueTags);

		//saving this snip to all of its tags in dbForTags
		for (let tag of currentSnip.tags) {
			try {
				const doc = await dbForTags.get(tag);
				// if we reach here, an entry for this tag already exists in dbForTags
				//thus, we get the snipsWithThisTag array out, add on the current snip, and save it back 
				let snipsWithThisTag = doc.snipsWithThisTag;
				snipsWithThisTag.push(currentSnip._id);
				dbForTags.put(doc).catch(err => console.log(err));

			} catch (err) {
				if (err.message === "missing") {
					//this error means an entry for this tag doesn't exist in dbForTags (i.e., the tag is new) 
					//thus, we create it
					dbForTags.put({ _id: tag, snipsWithThisTag: [currentSnip._id] }).catch(err => console.log(err));
				} else {
					console.log(err);
				}
			}
		}

		//saving the Snip in the dbForSnips
		dbForSnips.put(currentSnip).catch(err => console.log(err));

		//push the _id of the currently saved snip into the global
		idOfSnipIfAlreadySaved.push(_id);

	});

}


// GLOBAL VARIABLE
idOfSnipIfAlreadySaved = [];
//above is meant to be a global. Will only ever hold one element; the id of the snip if one has been saved on this page. This is updated by the saveANewSnip() function and checked in the onclick saveButton event handler below.

saveButton.onclick = async function () {

	if (idOfSnipIfAlreadySaved.length === 0) {
		//no snips have been saved yet. (ie, this is the first time the save button has been pushed) 
		saveANewSnip();

	} else {
		//One snip has been saved so far.
		const idOfOldSnip = idOfSnipIfAlreadySaved[0];

		try {
			let doc = await dbForSnips.get(idOfOldSnip);

			//check if the snipText has changed (don't want to do anything if it hasn't)
			if (doc.snipText !== document.getElementById("inputText").value) {
				//the snipText has changed.

				//delete the old snip 
				deleteSnip(doc);

				//clear this out; we'll be saving a new snip.
				idOfSnipIfAlreadySaved.pop();

				saveANewSnip();
				// recall that saveANewSnip() will mutate the global variable! I.e., it will put the id of the snip it saves into the global variable
			}
		} catch (err) {
			console.log(err)
		}

	}
}


openSnipsButton.onclick = function () {

	chrome.tabs.create({ url: "snips.html" });

}